from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session, selectinload
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from urllib.parse import urlparse
from pydantic import BaseModel
from app.database import get_db
from app.routers.auth import get_current_admin
from app.models.models import TrafficEvent, Order, Customer, ProductDesign, ProductVariant

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

EVENT_TYPES = {"page_view", "product_view", "add_to_cart", "catalog_download", "login", "order"}
IST = timedelta(hours=5, minutes=30)  # report days in Indian Standard Time
BOT_MARKERS = ("bot", "crawler", "spider", "slurp", "facebookexternalhit", "preview")


class TrackIn(BaseModel):
    visitor_id: str
    session_id: str
    event_type: str
    page: Optional[str] = None
    design_code: Optional[str] = None
    label: Optional[str] = None
    value: Optional[float] = None
    customer_email: Optional[str] = None
    referrer: Optional[str] = None


def _clip(s: Optional[str], n: int = 120) -> Optional[str]:
    s = (s or "").strip()
    return s[:n] or None


def _device(user_agent: str) -> str:
    ua = user_agent.lower()
    if "ipad" in ua or "tablet" in ua or ("android" in ua and "mobile" not in ua):
        return "tablet"
    if "mobi" in ua or "iphone" in ua or "android" in ua:
        return "mobile"
    return "desktop"


def _referrer_domain(ref: Optional[str], own_host: str) -> Optional[str]:
    if not ref:
        return None
    host = (urlparse(ref).hostname or "").lower()
    if host.startswith("www."):
        host = host[4:]
    own = own_host.lower().split(":")[0]
    if own.startswith("www."):
        own = own[4:]
    if not host or host == own:
        return None
    return host[:80]


@router.post("/track", status_code=204)
def track_event(event: TrackIn, request: Request, db: Session = Depends(get_db)):
    """Record one storefront event (public; called by the buyer site)."""
    user_agent = request.headers.get("user-agent", "")
    if event.event_type not in EVENT_TYPES or any(m in user_agent.lower() for m in BOT_MARKERS):
        return Response(status_code=204)
    visitor_id, session_id = _clip(event.visitor_id, 64), _clip(event.session_id, 64)
    if not visitor_id or not session_id:
        return Response(status_code=204)
    db.add(TrafficEvent(
        visitor_id=visitor_id,
        session_id=session_id,
        event_type=event.event_type,
        page=_clip(event.page, 40),
        design_code=_clip(event.design_code, 80),
        label=_clip(event.label, 120),
        value=event.value if event.value is not None and abs(event.value) < 1e12 else None,
        customer_email=(_clip(event.customer_email, 120) or "").lower() or None,
        device=_device(user_agent),
        referrer=_referrer_domain(event.referrer, request.headers.get("host", "")),
    ))
    db.commit()
    return Response(status_code=204)


def _order_value(order: Order) -> float:
    return float(sum((i.price or 0) * (i.quantity or 0) for i in order.items))


@router.get("/summary")
def traffic_summary(days: int = 7, db: Session = Depends(get_db), admin: dict = Depends(get_current_admin)):
    """Visitor, funnel and order report for the admin Traffic page (admin only)."""
    days = max(1, min(days, 365))
    now = datetime.utcnow()
    since = now - timedelta(days=days)

    events = db.query(TrafficEvent).filter(TrafficEvent.created_at >= since).all()
    orders = (
        db.query(Order).options(selectinload(Order.items))
        .filter(Order.order_date >= since).all()
    )

    visitors = {e.visitor_id for e in events}
    sessions = {e.session_id for e in events}
    by_type: Dict[str, List[TrafficEvent]] = defaultdict(list)
    for e in events:
        by_type[e.event_type].append(e)

    # New visitors = first ever event falls inside the range
    returning = set()
    if visitors:
        earlier = db.query(TrafficEvent.visitor_id).filter(
            TrafficEvent.created_at < since, TrafficEvent.visitor_id.in_(list(visitors))
        ).distinct().all()
        returning = {v for (v,) in earlier}

    def distinct_visitors(event_type: str) -> int:
        return len({e.visitor_id for e in by_type[event_type]})

    ordered_visitors = distinct_visitors("order")
    revenue = sum(_order_value(o) for o in orders)

    # Daily series (IST calendar days)
    day_keys = [((now + IST) - timedelta(days=i)).date() for i in range(min(days, 90) - 1, -1, -1)]
    daily = {d: {"visitors": set(), "page_views": 0, "orders": 0, "revenue": 0.0} for d in day_keys}
    for e in events:
        d = (e.created_at + IST).date()
        if d in daily:
            daily[d]["visitors"].add(e.visitor_id)
            if e.event_type in ("page_view", "product_view"):
                daily[d]["page_views"] += 1
    for o in orders:
        d = (o.order_date + IST).date()
        if d in daily:
            daily[d]["orders"] += 1
            daily[d]["revenue"] += _order_value(o)

    # Top products: views, unique viewers, add-to-cart
    product_views = Counter(e.design_code for e in by_type["product_view"] if e.design_code)
    product_viewers: Dict[str, set] = defaultdict(set)
    for e in by_type["product_view"]:
        if e.design_code:
            product_viewers[e.design_code].add(e.visitor_id)
    product_carts = Counter(e.design_code for e in by_type["add_to_cart"] if e.design_code)
    # Events store the product name (unique); order items store a variant code -> map it back to the product name
    variant_to_product = {
        code: name for code, name in db.query(ProductVariant.variant_code, ProductDesign.name)
        .join(ProductDesign, ProductVariant.design_id == ProductDesign.id).all()
    }
    ordered_qty: Counter = Counter()
    for o in orders:
        for i in o.items:
            ordered_qty[variant_to_product.get(i.variant_code) or i.design_code] += i.quantity or 0
    top_codes = sorted(
        set(product_views) | set(ordered_qty),
        key=lambda c: (product_views[c], ordered_qty[c]), reverse=True,
    )[:10]

    # Devices / referrers / downloads (by unique visitors where it makes sense)
    device_visitors: Dict[str, set] = defaultdict(set)
    referrer_visitors: Dict[str, set] = defaultdict(set)
    for e in events:
        device_visitors[e.device or "desktop"].add(e.visitor_id)
        if e.referrer:
            referrer_visitors[e.referrer].add(e.visitor_id)
    downloads = Counter(e.label or "Catalogue" for e in by_type["catalog_download"])

    # Logged-in customers who visited, and whether they ordered in this period
    cust_events: Dict[str, List[TrafficEvent]] = defaultdict(list)
    for e in events:
        if e.customer_email:
            cust_events[e.customer_email].append(e)
    customers_by_email = {}
    if cust_events:
        for c in db.query(Customer).filter(Customer.email.in_(list(cust_events))).all():
            customers_by_email[(c.email or "").lower()] = c
    orders_by_mobile: Dict[str, List[Order]] = defaultdict(list)
    for o in orders:
        if o.mobile_number:
            orders_by_mobile[o.mobile_number].append(o)
    customer_rows = []
    for email, evs in cust_events.items():
        c = customers_by_email.get(email)
        cust_orders = orders_by_mobile.get(c.mobile_number, []) if c and c.mobile_number else []
        customer_rows.append({
            "name": c.name if c else email.split("@")[0],
            "email": email,
            "mobile": c.mobile_number if c else None,
            "visits": len({e.session_id for e in evs}),
            "product_views": sum(1 for e in evs if e.event_type == "product_view"),
            "last_seen": (max(e.created_at for e in evs) + IST).isoformat(),
            "orders": len(cust_orders),
            "order_value": round(sum(_order_value(o) for o in cust_orders), 2),
        })
    customer_rows.sort(key=lambda r: r["last_seen"], reverse=True)

    recent_orders = sorted(orders, key=lambda o: o.order_date, reverse=True)[:10]

    return {
        "days": days,
        "kpis": {
            "visitors": len(visitors),
            "new_visitors": len(visitors - returning),
            "returning_visitors": len(visitors & returning),
            "sessions": len(sessions),
            "page_views": len(by_type["page_view"]) + len(by_type["product_view"]),
            "product_views": len(by_type["product_view"]),
            "catalog_downloads": len(by_type["catalog_download"]),
            "logged_in_customers": len(cust_events),
            "orders": len(orders),
            "revenue": round(revenue, 2),
            "conversion_rate": round(100 * ordered_visitors / len(visitors), 1) if visitors else 0.0,
            "live_now": len({e.visitor_id for e in events if e.created_at >= now - timedelta(minutes=5)}),
        },
        "funnel": [
            {"step": "Visited the site", "visitors": len(visitors)},
            {"step": "Viewed a product", "visitors": distinct_visitors("product_view")},
            {"step": "Added to cart", "visitors": distinct_visitors("add_to_cart")},
            {"step": "Placed an order", "visitors": ordered_visitors},
        ],
        "daily": [
            {
                "date": d.isoformat(),
                "visitors": len(v["visitors"]),
                "page_views": v["page_views"],
                "orders": v["orders"],
                "revenue": round(v["revenue"], 2),
            }
            for d, v in daily.items()
        ],
        "top_products": [
            {
                "design_code": c,
                "views": product_views[c],
                "viewers": len(product_viewers[c]),
                "added_to_cart": product_carts[c],
                "ordered_qty": ordered_qty[c],
            }
            for c in top_codes
        ],
        "devices": sorted(
            [{"device": k, "visitors": len(v)} for k, v in device_visitors.items()],
            key=lambda r: r["visitors"], reverse=True,
        ),
        "referrers": sorted(
            [{"source": k, "visitors": len(v)} for k, v in referrer_visitors.items()],
            key=lambda r: r["visitors"], reverse=True,
        )[:8],
        "downloads": [{"catalogue": k, "count": v} for k, v in downloads.most_common(8)],
        "customers": customer_rows[:50],
        "recent_orders": [
            {
                "order_number": o.order_number,
                "customer_name": o.customer_name,
                "mobile": o.mobile_number,
                "date": (o.order_date + IST).isoformat(),
                "status": o.status,
                "items": sum(i.quantity or 0 for i in o.items),
                "value": round(_order_value(o), 2),
            }
            for o in recent_orders
        ],
    }
