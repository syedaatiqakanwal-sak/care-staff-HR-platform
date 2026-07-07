import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VleCredential } from './vle-credential.entity';
import { VleCredentialsService } from './vle-credentials.service';
import { User } from '../users/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([VleCredential, User]),
    ],
    providers: [VleCredentialsService],
    exports: [VleCredentialsService],
})
export class VleCredentialsModule { }
