import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AnalyticsContextService } 
  from '../../core/services/analytics-context.service';
import { SocketService } from '../../core/services/socket.service';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  loginForm: FormGroup;
  showPassword = false;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private analyticsContext: AnalyticsContextService, // ✅ ADD THIS
    private socket: SocketService,

    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.analyticsContext.loadSites();

        this.loading = false;
        this.router.navigate(['/dashboard/overview']);
      },
      error: () => {
        this.loading = false;

        // ✅ POPUP AS REQUESTED
        alert('Invalid Credentials, try again');
      }
    });
    this.socket.connect();
  }
}
