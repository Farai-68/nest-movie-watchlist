import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer'; 
import { randomBytes } from 'crypto'; 
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const response = { message: 'If an account exists, a reset link has been sent.' };

    if (!user) return response;

    const resetToken = randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    const resetLink = `https://movie-watchlist-ui.vercel.app/reset-password?token=${resetToken}`;

    try {
      // 1. Initialize the OAuth2 Client
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground' 
      );

      // 2. Hand over the Refresh Token
      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      });

      // 3. Ask Google for a temporary, secure Access Token
      const accessToken = await oauth2Client.getAccessToken();

      // 4. Configure Nodemailer to use OAuth2 instead of a standard port/password
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER,
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      });

      const mailOptions = {
        from: `"Watchlist App" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset</h2>
          <p>You requested to reset your password. Click the link below to set a new one:</p>
          <a href="${resetLink}">Reset My Password</a>
          <p><i>This link will expire in 15 minutes. If you did not request this, please ignore this email.</i></p>
        `,
      };

      // 5. Send the email securely over HTTPS (Port 443)
      await transporter.sendMail(mailOptions);
      
      return response;
    } catch (error) {
      console.error('❌ EMAIL ERROR:', error);
      return response;
    }
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
