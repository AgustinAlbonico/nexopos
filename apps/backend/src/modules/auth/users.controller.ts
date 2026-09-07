import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    UseGuards,
} from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser } from './interfaces';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import { ZodValidationPipe } from './pipes/zod-validation.pipe';
import {
    CreateUserDto,
    UpdateUserDto,
    CreateUserSchema,
    UpdateUserSchema,
} from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Crear nuevo usuario' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
    @ApiResponse({ status: 409, description: 'El email ya está registrado' })
    async create(
        @Body(new ZodValidationPipe(CreateUserSchema)) dto: CreateUserDto,
    ) {
        return this.usersService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'Listar todos los usuarios' })
    @ApiResponse({ status: 200, description: 'Lista de usuarios' })
    async findAll() {
        return this.usersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener usuario por ID' })
    @ApiParam({ name: 'id', description: 'ID del usuario (UUID)' })
    @ApiResponse({ status: 200, description: 'Usuario encontrado' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Actualizar usuario' })
    @ApiParam({ name: 'id', description: 'ID del usuario (UUID)' })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'Usuario actualizado exitosamente' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    @ApiResponse({ status: 409, description: 'El email ya está en uso' })
    async update(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateUserSchema)) dto: UpdateUserDto,
    ) {
        return this.usersService.update(id, dto);
    }

    @Patch(':id/toggle-status')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Activar/Desactivar usuario' })
    @ApiParam({ name: 'id', description: 'ID del usuario (UUID)' })
    @ApiResponse({ status: 200, description: 'Estado del usuario actualizado' })
    @ApiResponse({ status: 400, description: 'No se puede desactivar la propia cuenta' })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
    async toggleStatus(
        @Param('id') id: string,
        @CurrentUser() currentUser: AuthUser,
    ) {
        return this.usersService.toggleStatus(id, currentUser.userId);
    }
}
