import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MoviesService {
  // Inject our global Prisma database service
  constructor(private prisma: PrismaService) {}

  // 1. Save a new movie to the database
  create(createMovieDto: CreateMovieDto) {
    return this.prisma.movie.create({
      data: createMovieDto,
    });
  }

  // 2. Fetch every movie in the database
  findAll() {
    return this.prisma.movie.findMany();
  }

  // 3. Fetch a single movie using its unique UUID
  findOne(id: string) {
    return this.prisma.movie.findUnique({
      where: { id },
    });
  }

  // 4. Update a movie's details (like marking it watched or updating a rating)
  update(id: string, updateMovieDto: UpdateMovieDto) {
    return this.prisma.movie.update({
      where: { id },
      data: updateMovieDto,
    });
  }

  // 5. Delete a movie completely
  remove(id: string) {
    return this.prisma.movie.delete({
      where: { id },
    });
  }
}
