// cotebek/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AppRole } from '../constants/enums.constant';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
