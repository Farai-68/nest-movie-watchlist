import { PartialType } from '@nestjs/mapped-types';
import { CreateMovieDto } from './create-movie.dto';
import { IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateMovieDto extends PartialType(CreateMovieDto) {
  @IsBoolean()
  @IsOptional()
  isWatched?: boolean;

  @IsInt()
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  @IsOptional()
  rating?: number;
}
