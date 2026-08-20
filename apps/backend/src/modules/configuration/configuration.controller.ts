import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { CapabilitiesManifestResponseDto, CapabilitiesResponseDto } from './dto/capabilities-response.dto';
import { UpdateCapabilitiesDto } from './dto/update-capabilities.dto';
import { UpdateConfigurationDto } from './dto/update-configuration.dto';
import { SystemConfigurationLegacyResponseDto } from './dto/system-configuration-legacy-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

/**
 * Controlador de configuración del sistema
 */
@ApiTags('configuration')
@Controller('configuration')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ConfigurationController {
    constructor(private readonly configService: ConfigurationService) { }

    @Get()
    @ApiOperation({ summary: 'Obtener configuración del sistema' })
    @ApiResponse({ status: 200, type: SystemConfigurationLegacyResponseDto })
    getConfiguration() {
        return this.configService.getLegacyResponse();
    }

    @Get('variable-barcode-layout')
    @ApiOperation({ summary: 'Obtener layout local de códigos variables' })
    getVariableBarcodeLayout() {
        return this.configService.getVariableBarcodeLayout();
    }

    @Get('capabilities')
    @ApiOperation({ summary: 'Obtener capacidades activas' })
    @ApiOkResponse({ type: CapabilitiesResponseDto })
    getCapabilities(): Promise<CapabilitiesResponseDto> {
        return this.configService.getCapabilitiesResponse();
    }

    @Get('manifest')
    @ApiOperation({ summary: 'Obtener manifiesto de capacidades' })
    @ApiOkResponse({ type: CapabilitiesManifestResponseDto })
    getCapabilitiesManifest(): Promise<CapabilitiesManifestResponseDto> {
        return this.configService.getCapabilitiesManifest();
    }

    @Patch()
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Actualizar configuración del sistema' })
    @ApiResponse({ status: 200, type: SystemConfigurationLegacyResponseDto })
    async updateConfiguration(@Body() updateDto: UpdateConfigurationDto) {
        const config = await this.configService.updateConfiguration(updateDto);
        return this.configService.getLegacyResponse(config);
    }

    @Patch('capabilities')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Actualizar perfil y overrides de capacidades' })
    @ApiOkResponse({ type: CapabilitiesResponseDto })
    updateCapabilities(@Body() updateDto: UpdateCapabilitiesDto): Promise<CapabilitiesResponseDto> {
        return this.configService.updateCapabilities(updateDto);
    }

    @Post('verify-technician-key')
    @ApiOperation({ summary: 'Verificar clave técnica de administración' })
    verifyTechnicianKey(@Body() body: { key: string }) {
        const valid = this.configService.verifyTechnicianKey(body.key);
        return { valid };
    }

    @Post('onboarding')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Completar onboarding inicial de rubro de negocio' })
    @ApiOkResponse({ type: CapabilitiesResponseDto })
    completeOnboarding(@Body() body: { businessTypeKey: string }): Promise<CapabilitiesResponseDto> {
        return this.configService.completeOnboarding(body.businessTypeKey);
    }

    @Patch('profile')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Actualizar perfil técnico con clave técnica y auditoría' })
    @ApiOkResponse({ type: CapabilitiesResponseDto })
    updateProfile(@Body() body: { profileKey: string; technicianKey: string }): Promise<CapabilitiesResponseDto> {
        return this.configService.updateProfileWithTechnicianKey(body.profileKey, body.technicianKey);
    }

    @Post('update-all-prices')
    @Roles(UserRole.ADMIN, UserRole.MANAGER)
    @ApiOperation({ summary: 'Actualizar precio de todos los productos según el % de ganancia' })
    @ApiResponse({ status: 200, description: 'Productos actualizados' })
    updateAllPrices(@Body() body: UpdateConfigurationDto) {
        return this.configService.updateAllProductsPrices(body.defaultProfitMargin);
    }
}
