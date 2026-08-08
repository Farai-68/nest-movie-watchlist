import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer'; 
import { randomBytes } from 'crypto'; 

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async forgotPassword(email: string) {
    // 1. Find the user
    const user = await this.prisma.user.findUnique({ where: { email } });
      
    if (!user) {
      return { message: 'If an account exists, a reset link has been sent.' };
    }
  
    // 2. Generate a 15-minute secure token
    const resetToken = randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); 
  
    // 3. Save the token in the database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });
  
   // 4. Configured Nodemailer with explicit Gmail settings
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
      
        // 5. Create the reset link
        
     const resetLink = `https://movie-watchlist-ui.vercel.app/reset-password?token=${resetToken}`;
      
        // 6. Send the email with error catching
        const mailOptions = {
          from: '"Watchlist App" <no-reply@watchlist.com>',
          to: user.email,
          subject: 'Password Reset Request',
          html: `
            <h2>Password Reset</h2>
            <p>You requested to reset your password. Click the link below to set a new one:</p>
            <a href="${resetLink}">Reset My Password</a>
            <p><i>This link will expire in 15 minutes. If you did not request this, please ignore this email.</i></p>
          `,
        };
      
        try {
          await transporter.sendMail(mailOptions);
          return { message: 'If an account exists, a reset link has been sent.' };
        } catch (error) {
          
          console.error('❌ EMAIL ERROR:', error); 
          throw new UnauthorizedException('Email failed to send. Check backend terminal.');
        }
  
    await transporter.sendMail(mailOptions);
  
    return { message: 'If an account exists, a reset link has been sent.' };
  } 

  async resetPassword(password: string, token: string) {
      // 1. Find the user with this specific token and ensure it hasn't expired
      const user = await this.prisma.user.findFirst({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: {
            gt: new Date(), 
          },
        },
      });
  
      if (!user) {
        throw new BadRequestException('Invalid or expired password reset token');
      }
  
      // 2. Hash the brand new password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // 3. Update the user in the database and wipe the temporary tokens clean
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });
  
      return { message: 'Password has been successfully reset' };
    }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('This email is already registered.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    // 1. Find the user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // 2. If user doesn't exist, block them
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Compare the typed password with the hashed database password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 4. Generate the JWT VIP wristband
    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    // 5. Return the token and user info
    const { password, ...userWithoutPassword } = user;
    return {
      access_token: token,
      user: userWithoutPassword,
    };
  }
}
