import type { LoginRequest, RegisterRequest } from '@nexustrade/contracts';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto implements RegisterRequest {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/, { message: 'password must contain an uppercase letter' })
  @Matches(/\d/, { message: 'password must contain a number' })
  password!: string;

  @IsString()
  @Length(2, 120)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  displayName!: string;

  @IsString()
  @Length(2, 160)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  organizationName!: string;
}

export class LoginDto implements LoginRequest {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;

  @IsString()
  password!: string;
}
