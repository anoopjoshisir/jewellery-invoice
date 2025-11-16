import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  /**
   * Show a success message
   * @param message - The message to display
   * @param duration - Duration in milliseconds (default: 3000)
   */
  success(message: string, duration: number = 3000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    };
    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Show an error message
   * @param message - The error message to display
   * @param duration - Duration in milliseconds (default: 5000)
   */
  error(message: string, duration: number = 5000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    };
    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Show an info message
   * @param message - The info message to display
   * @param duration - Duration in milliseconds (default: 4000)
   */
  info(message: string, duration: number = 4000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['info-snackbar']
    };
    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Show a warning message
   * @param message - The warning message to display
   * @param duration - Duration in milliseconds (default: 4000)
   */
  warning(message: string, duration: number = 4000): void {
    const config: MatSnackBarConfig = {
      duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['warning-snackbar']
    };
    this.snackBar.open(message, 'Close', config);
  }

  /**
   * Show a custom message with custom configuration
   * @param message - The message to display
   * @param action - The action button text
   * @param config - Custom configuration
   */
  custom(message: string, action: string = 'Close', config?: MatSnackBarConfig): void {
    const defaultConfig: MatSnackBarConfig = {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      ...config
    };
    this.snackBar.open(message, action, defaultConfig);
  }
}
