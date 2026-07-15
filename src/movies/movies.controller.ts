import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Post()
  create(@Body() createMovieDto: CreateMovieDto, @Request() req) {
    return this.moviesService.create(createMovieDto, req.user.userId || req.user.sub);
  }

  @Get()
  findAll(@Request() req) {
    return this.moviesService.findAll(req.user.userId || req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.moviesService.findOne(id, req.user.userId || req.user.sub);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMovieDto: UpdateMovieDto, @Request() req) {
    return this.moviesService.update(id, updateMovieDto, req.user.userId || req.user.sub);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.moviesService.remove(id, req.user.userId || req.user.sub);
  }
}
