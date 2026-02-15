import { Routes } from '@angular/router';
import { authGuard, guestOnlyGuard, roleGuard } from './core/auth.guard';
import { LoginComponent } from './features/login.component';
import { DashboardComponent } from './features/dashboard.component';
import { StudentTestComponent } from './features/student-test.component';
import { StudentLibraryComponent } from './features/student-library.component';
import { TeacherDashboardComponent } from './features/teacher-dashboard.component';
import { AdminDashboardComponent } from './features/admin-dashboard.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'login', component: LoginComponent, canActivate: [guestOnlyGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'student-test', component: StudentTestComponent, canActivate: [authGuard] },
  {
    path: 'student-library',
    component: StudentLibraryComponent,
    canActivate: [authGuard, roleGuard(['student'])]
  },
  {
    path: 'teacher-dashboard',
    component: TeacherDashboardComponent,
    canActivate: [authGuard, roleGuard(['teacher', 'admin'])]
  },
  {
    path: 'admin-dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard(['admin'])]
  },
  { path: '**', redirectTo: 'dashboard' }
];
