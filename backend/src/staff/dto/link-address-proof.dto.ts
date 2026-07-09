import { IsUUID } from 'class-validator';

export class LinkAddressProofDto {
    @IsUUID()
    proofDocumentId: string;
}
