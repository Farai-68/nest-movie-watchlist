import { Injectable } from '@nestjs/common';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MoviesService {
  constructor(private prisma: PrismaService) {}

  create(createMovieDto: CreateMovieDto, userId: string) {
    return this.prisma.movie.create({
      data: {
        ...createMovieDto,
        userId: userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.movie.findMany({
      where: {
        userId: userId,
      },
    });
  }

  // Changed id from number to string!
  findOne(id: string) {
    return this.prisma.movie.findUnique({
      where: { id },
    });
  }

  // Changed id from number to string!
  update(id: string, updateMovieDto: UpdateMovieDto) {
    return this.prisma.movie.update({
      where: { id },
      data: updateMovieDto,
    });
  }

  // Changed id from number to string!
  remove(id: string) {
    return this.prisma.movie.delete({
      where: { id },
    });
  }
}
