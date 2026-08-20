/**
 * Controlador de configuración fiscal (AFIP)
 * Endpoints para gestionar datos del emisor, certificados y conexión
 */
import {
    Controller,
    Get,
    Patch,
    Post,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { FiscalConfigurationService } from './fiscal-configuration.service';
import { CertificateGenerationService } from './certificate-generation.service';
import {
    UpdateEmitterDataDto,
    UpdateAfipEnvironmentDto,
    UploadCertificatesDto,
    FiscalConfigurationResponseDto,
    AfipConnectionStatusDto,
} from './dto/fiscal-configuration.dto';
import { GenerateCertificateDto, GenerateCertificateResponseDto } from './dto/generate-certificates.dto';
import { AfipEnvironment } from './entities/fiscal-configuration.entity';

@ApiTags('Configuración Fiscal (AFIP)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('configuration/fiscal')
export class FiscalConfigurationController {
    constructor(
        private readonly fiscalConfigService: FiscalConfigurationService,
        private readonly certificateGenService: CertificateGenerationService,
    ) { }

    /**
     * Obtiene la configuración fiscal actual
     */
    @Get()
    @ApiOperation({ summary: 'Obtener configuración fiscal' })
    @ApiResponse({ status: 200, type: FiscalConfigurationResponseDto })
    async getConfiguration(): Promise<FiscalConfigurationResponseDto> {
        return this.fiscalConfigService.getPublicConfiguration();
    }

    /**
     * Actualiza los datos del emisor (razón social, CUIT, etc.)
     */
    @Patch('emitter')
    @ApiOperation({ summary: 'Actualizar datos del emisor' })
    @ApiResponse({ status: 200, type: FiscalConfigurationResponseDto })
    async updateEmitterData(
        @Body() dto: UpdateEmitterDataDto
    ): Promise<FiscalConfigurationResponseDto> {
        return this.fiscalConfigService.updateEmitterData(dto);
    }

    /**
     * Cambia el entorno activo de AFIP
     */
    @Patch('environment')
    @ApiOperation({ summary: 'Cambiar entorno AFIP (homologación/producción)' })
    @ApiResponse({ status: 200, type: FiscalConfigurationResponseDto })
    async setEnvironment(
        @Body() dto: UpdateAfipEnvironmentDto
    ): Promise<FiscalConfigurationResponseDto> {
        return this.fiscalConfigService.setEnvironment(dto.environment);
    }

    /**
     * Genera un CSR y clave privada para certificados AFIP
     */
    @Post('certificates/generate')
    @ApiOperation({ summary: 'Generar CSR y clave privada para certificados AFIP' })
    @ApiResponse({ status: 201, type: GenerateCertificateResponseDto })
    async generateCertificate(
        @Body() dto: GenerateCertificateDto
    ): Promise<GenerateCertificateResponseDto> {
        return this.certificateGenService.generateCertificate(dto.environment);
    }

    /**
     * Sube certificados para un entorno
     */
    @Post('certificates')
    @ApiOperation({ summary: 'Subir certificados AFIP' })
    @ApiResponse({ status: 201, type: FiscalConfigurationResponseDto })
    async uploadCertificates(
        @Body() dto: UploadCertificatesDto
    ): Promise<FiscalConfigurationResponseDto> {
        return this.fiscalConfigService.uploadCertificates(dto);
    }

    /**
     * Elimina los certificados de un entorno
     */
    @Delete('certificates/:environment')
    @ApiOperation({ summary: 'Eliminar certificados de un entorno' })
    @ApiParam({ name: 'environment', enum: AfipEnvironment })
    @ApiResponse({ status: 200, type: FiscalConfigurationResponseDto })
    async deleteCertificates(
        @Param('environment') environment: AfipEnvironment
    ): Promise<FiscalConfigurationResponseDto> {
        return this.fiscalConfigService.deleteCertificates(environment);
    }

    /**
     * Verifica si está listo para facturar
     */
    @Get('status')
    @ApiOperation({ summary: 'Verificar si está listo para facturar' })
    async getStatus(): Promise<{
        ready: boolean;
        missingFields: string[];
    }> {
        return this.fiscalConfigService.isReadyForInvoicing();
    }

    /**
     * Prueba la conexión con AFIP
     */
    @Post('test-connection')
    @ApiOperation({ summary: 'Probar conexión con AFIP' })
    @ApiResponse({ status: 200, type: AfipConnectionStatusDto })
    async testConnection(): Promise<AfipConnectionStatusDto> {
        return this.fiscalConfigService.testAfipConnection();
    }
}
