import { Global, Module } from '@nestjs/common';
import { R2FilesService } from './r2-files.service';

@Global()
@Module({
  providers: [R2FilesService],
  exports: [R2FilesService],
})
export class CommonModule {}
