import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  constructor(private router: Router) {}

  logout() {
    // If you have token/localStorage clearing, do it here
    // localStorage.clear();

    this.router.navigate(['/login']);
  }
}
