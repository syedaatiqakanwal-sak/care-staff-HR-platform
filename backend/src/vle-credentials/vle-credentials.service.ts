
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { VleCredential } from './vle-credential.entity';
import { User, UserRole } from '../users/user.entity';
import { canEditOtherStaffProfiles, canViewOtherStaffProfiles } from '../users/role.utils';

@Injectable()
export class VleCredentialsService {
    // Encryption Config - key derived from env variables
    private readonly algorithm = 'aes-256-cbc';
    private readonly key = crypto.scryptSync(process.env.VLE_ENCRYPTION_KEY || (() => { throw new Error('VLE_ENCRYPTION_KEY not set in .env'); })(), process.env.VLE_ENCRYPTION_SALT || (() => { throw new Error('VLE_ENCRYPTION_SALT not set in .env'); })(), 32);

    constructor(
        @InjectRepository(VleCredential)
        private vleRepo: Repository<VleCredential>,
        @InjectRepository(User)
        private userRepo: Repository<User>,
    ) { }

    private encrypt(text: string): string {
        // Generate a random IV for each encryption (critical for AES-CBC security)
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Prepend IV (hex) to ciphertext so we can extract it during decryption
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(encryptedText: string): string {
        try {
            if (encryptedText.includes(':')) {
                // New format: iv:ciphertext
                const [ivHex, ciphertext] = encryptedText.split(':');
                const iv = Buffer.from(ivHex, 'hex');
                const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
                let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            } else {
                // Legacy format: no IV prefix, use zero IV for backward compatibility
                const legacyIv = Buffer.alloc(16, 0);
                const decipher = crypto.createDecipheriv(this.algorithm, this.key, legacyIv);
                let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
                decrypted += decipher.final('utf8');
                return decrypted;
            }
        } catch (e) {
            // If decryption fails, return empty to force credential re-entry
            return '';
        }
    }

    async getCredentials(requestUser: User | any, targetUserId: string) {
        const requesterId = requestUser.id || requestUser.userId;

        // RBAC: Only Admin or the user themselves can view
        if (!canViewOtherStaffProfiles(requestUser.role) && requesterId !== targetUserId) {
            throw new ForbiddenException('You can only view your own credentials');
        }

        const creds = await this.vleRepo.findOne({
            where: { userId: targetUserId },
            select: ['id', 'username', 'password', 'loginUrl', 'updatedAt']
        });

        if (!creds) {
            return {
                username: null,
                loginUrl: 'https://vle.inspirelondoncollege.com/login/index.php',
                status: 'Not Assigned'
            };
        }

        // ROLE-AWARE RESPONSE LOGIC
        // Update: Allow both Admin AND Owner (Staff) to see the real password so they can use it.
        if (canEditOtherStaffProfiles(requestUser.role) || requestUser.id === targetUserId || requestUser['userId'] === targetUserId) {
            return {
                ...creds,
                password: this.decrypt(creds.password) // Show Real Password
            };
        }

        // Fallback for safety (though RBAC prevents reaching here usually)
        return {
            ...creds,
            password: '********'
        };
    }

    async updateCredentials(adminUser: User | any, targetUserId: string, updateDto: { username: string; password?: string }) {
        // RBAC Check
        if (!canEditOtherStaffProfiles(adminUser.role) && !adminUser.isApiToken) {
            throw new ForbiddenException('Only Admins can update VLE credentials');
        }

        const user = await this.userRepo.findOne({ where: { id: targetUserId } });
        if (!user) throw new NotFoundException('User not found');

        let creds = await this.vleRepo.findOne({ where: { userId: targetUserId } });

        if (!creds) {
            creds = this.vleRepo.create({
                userId: targetUserId,
                username: updateDto.username,
            });
        } else {
            creds.username = updateDto.username;
        }

        if (updateDto.password) {
            creds.password = this.encrypt(updateDto.password);
        }

        return this.vleRepo.save(creds);
    }
}
