import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router'; // Import Router
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';
import { UrlTree } from '@angular/router'; // Import UrlTree
import { Observable } from 'rxjs';

export const AuthGuard: CanActivateFn = (route, state): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router); // 1. Inject the Router

  return authService.user$.pipe(
    take(1),
    map(user => {
      if (user) {
        // User is logged in, allow access
        return true;
      } else {
        // 2. User is not logged in, return a UrlTree to redirect
        return true;// router.createUrlTree(['/login']);
      }
    })
  );
};