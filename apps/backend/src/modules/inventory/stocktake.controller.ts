import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
    ApprovalResult,
    CreateStocktakeSessionInput,
    RecordCountInput,
    StocktakeService,
} from './stocktake.service';
import { StocktakeSession } from './entities/stocktake-session.entity';

/**
 * Plan reference: `apps/backend/src/modules/inventory/stocktake.controller.ts` (T9).
 *
 * Mounted at `/api/inventory/stocktake` so it lives next to the rest of
 * the inventory endpoints. The controller stays thin: every action that
 * touches multiple tables is executed inside a transaction by the service.
 */

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('inventory/stocktake')
export class StocktakeController {
    constructor(private readonly stocktakeService: StocktakeService) {}

    @Post()
    @HttpCode(201)
    @ApiOperation({ summary: 'Start a stocktake session and snapshot product stock' })
    start(@Body() body: CreateStocktakeSessionInput): Promise<StocktakeSession> {
        return this.stocktakeService.start(body);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Fetch a stocktake session with its lines' })
    findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<StocktakeSession | null> {
        return this.stocktakeService.findOneWithLines(id);
    }

    @Post(':id/count')
    @HttpCode(200)
    @ApiOperation({ summary: 'Record a count for one line of the session' })
    recordCount(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() body: Omit<RecordCountInput, 'lineId'> & { lineId: string },
    ): Promise<{ lineId: string }> {
        return this.stocktakeService
            .recordCount({
                lineId: body.lineId,
                countedQuantity: body.countedQuantity,
                countedById: body.countedById,
                reasonCode: body.reasonCode,
            })
            .then((line) => ({ lineId: line.id }));
    }

    @Post(':id/approve')
    @HttpCode(200)
    @ApiOperation({ summary: 'Approve the session, emitting one ADJUSTMENT movement per variance' })
    approve(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() body: { approvedById: string },
    ): Promise<ApprovalResult> {
        return this.stocktakeService.approve(id, body.approvedById);
    }

    @Post(':id/cancel')
    @HttpCode(200)
    @ApiOperation({ summary: 'Cancel an open or counting session' })
    cancel(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() body: { cancelledById: string },
    ): Promise<StocktakeSession> {
        return this.stocktakeService.cancel(id, body.cancelledById);
    }
}