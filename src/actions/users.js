'use server';

import { revalidatePath } from 'next/cache';
import prisma from '../lib/prisma';
import { hashPassword } from '../lib/auth';

const ROLES = ['super-admin', 'admin', 'manager'];

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  details: true,
};

function serialize(obj) {
  return JSON.parse(JSON.stringify(obj));
}

async function getSuperAdminGuard(id) {
  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (user?.role === 'super-admin') {
    throw new Error('The super-admin account cannot be edited or deleted.');
  }
}

export async function getUsers() {
  const users = await prisma.user.findMany({
    select: SELECT,
    orderBy: { createdAt: 'desc' },
  });
  return serialize(users);
}

function detailData(data) {
  return { phoneNumber: data.phoneNumber || null, shippingAddress: '' };
}

export async function createUser(data) {
  const { email, password, role, status } = data;
  if (!email || !password) throw new Error('Email and password are required.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!ROLES.includes(role)) throw new Error('Invalid role.');
  if (!['active', 'inactive'].includes(status)) throw new Error('Invalid status.');

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error('A user with this email already exists.');

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      role,
      status,
      details: { create: detailData(data) },
      passwordHash: await hashPassword(password),
    },
  });
  revalidatePath('/admin/users');
  return serialize({ ...user, passwordHash: undefined });
}

export async function updateUser(id, data) {
  await getSuperAdminGuard(id);
  const { role, status, password } = data;
  if (role && !ROLES.includes(role)) throw new Error('Invalid role.');
  if (status && !['active', 'inactive'].includes(status)) throw new Error('Invalid status.');
  if (password && password.length < 6) throw new Error('Password must be at least 6 characters.');

  const user = await prisma.user.update({
    where: { id },
    data: {
      name: data.name,
      email: data.email,
      role,
      status,
      ...(data.phoneNumber !== undefined
        ? { details: { upsert: { create: detailData(data), update: { phoneNumber: data.phoneNumber || null } } } }
        : {}),
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });
  revalidatePath('/admin/users');
  return serialize({ ...user, passwordHash: undefined });
}

export async function updateUserStatus(id, status) {
  await getSuperAdminGuard(id);
  if (!['active', 'inactive'].includes(status)) throw new Error('Invalid status.');
  await prisma.user.update({ where: { id }, data: { status } });
  revalidatePath('/admin/users');
}

export async function updateUserRole(id, role) {
  await getSuperAdminGuard(id);
  if (!ROLES.includes(role)) throw new Error('Invalid role.');
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath('/admin/users');
}

export async function deleteUser(id) {
  await getSuperAdminGuard(id);
  await prisma.$transaction(async (tx) => {
    await tx.userDetails.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });
  revalidatePath('/admin/users');
}