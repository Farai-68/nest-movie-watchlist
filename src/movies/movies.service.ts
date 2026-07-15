import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}

 create(createMovieDto: CreateMovieDto, userId: string) {
      return this.prisma.movie.create({
        data: {
          title: createMovieDto.title,
          description: createMovieDto.description || '', // Forces a string even if left blank
          userId: userId,
        },
      });
    }

  findAll(userId: string) {
    return this.prisma.movie.findMany({
      where: { userId: userId },
    });
  }

  async findOne(id: string, userId: string) {
    // We query by BOTH the movie ID and the user's ID
    const movie = await this.prisma.movie.findFirst({
      where: { id: id, userId: userId },
    });
    
    if (!movie) {
      throw new NotFoundException('Movie not found or you do not have permission to view it');
    }
    return movie;
  }

  async update(id: string, updateMovieDto: UpdateMovieDto, userId: string) {
    // 1. Verify ownership first
    await this.findOne(id, userId); 
    
    // 2. If it didn't throw an error, proceed with the update
    return this.prisma.movie.update({
      where: { id },
      data: updateMovieDto,
    });
  }

  async remove(id: string, userId: string) {
    // 1. Verify ownership first
    await this.findOne(id, userId);
    
    // 2. If it didn't throw an error, proceed with deletion
    return this.prisma.movie.delete({
      where: { id },
    });
  }
}
