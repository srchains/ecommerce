export interface DigitalCard {
  id: string;
  name: string;
  profileImage?: string;
  company?: string;
  designation?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  address?: string;
  bio?: string;
  nfcWritten?: boolean;
  views?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateDigitalCardInput = Omit<
  DigitalCard,
  'id' | 'nfcWritten' | 'createdAt' | 'updatedAt' | 'views'
>;

export type UpdateDigitalCardInput = Partial<CreateDigitalCardInput> & {
  views?: number;
  nfcWritten?: boolean;
};
