import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { google } from 'googleapis';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    try {
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'https://developers.google.com/oauthplayground'
      );

      oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN as string,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      const emailLines = [
        `From: "Watchlist App" <${process.env.EMAIL_USER}>`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        htmlContent,
      ];

      const emailRaw = emailLines.join('\r\n');
      const base64EncodedEmail = Buffer.from(emailRaw)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64EncodedEmail,
        },
      });

      return true;
    } catch (error) {
      console.error('EMAIL ERROR:', error);
      return false;
    }
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

    const welcomeHtml = `
      <h2>Welcome to the Watchlist Community! 🎬</h2>
      <p>Yow there,</p>
      <p>We are thrilled to have you on board. Start searching for your favorite movies and building your ultimate watchlist today.</p>
      <p>Happy watching!</p>
    `;
    await this.sendEmail(user.email, 'Welcome to Movie Watchlist!', welcomeHtml);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    const { password, ...userWithoutPassword } = user;
    return {
      access_token: token,
      user: userWithoutPassword,
    };
  }

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
    const resetHtml = `
      <h2>Password Reset</h2>
      <p>You requested to reset your password. Click the link below to set a new one:</p>
      <a href="${resetLink}">Reset My Password</a>
      <p><i>This link will expire in 15 minutes. If you did not request this, please ignore this email.</i></p>
    `;

    await this.sendEmail(user.email, 'Password Reset Request', resetHtml);

    return response;
  }

  async resetPassword(password: string, token: string) {
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

    const hashedPassword = await bcrypt.hash(password, 10);

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

  async deleteAccount(userId: any) {
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account successfully deleted' };
  }
}
