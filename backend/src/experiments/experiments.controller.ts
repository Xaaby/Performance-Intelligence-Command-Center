import { Controller, Get } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';

@Controller('experiments')
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @Get()
  getExperiments() {
    return this.experimentsService.getExperimentsResponse();
  }
}
