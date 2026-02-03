'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignupSchema, SignupState } from '@/lib/definitions';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

export async function registerUser(prevState: SignupState, formData: FormData) {
  const validatedFields = SignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Register.',
    };
  }

  const { name, email, password } = validatedFields.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        message: 'Account with this email already exists.',
      };
    }

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    return {
      message: 'Something went wrong. Please try again.',
    };
  }
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    console.log('Attempting login...');
    const email = formData.get('email');
    const password = formData.get('password');
    await signIn('credentials', { email, password, redirectTo: '/projects' });
  } catch (error) {
    console.log('Login error type:', error.constructor.name);
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}
