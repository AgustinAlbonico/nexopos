import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiagnosticsService, type ScaleStatus } from './diagnostics.service';

@Controller('diagnostics')
@UseGuards(JwtAuthGuard)
export class DiagnosticsController {
    constructor(private readonly diagnosticsService: DiagnosticsService) {}

    @Get('scale')
    getScaleStatus(): ScaleStatus {
        return this.diagnosticsService.getScaleStatus();
    }
}
