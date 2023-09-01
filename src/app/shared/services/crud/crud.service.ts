import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { retry, catchError } from 'rxjs/operators';
import { Lock } from '../../../types/Lock';
import { getJwtRequestOptions } from '../auth/jwtHelper';

interface ResponseWithLocks {
  locks: Lock[];
}

@Injectable({
  providedIn: 'root',
})
export class CrudService {
  endpoint = 'http://localhost:8000';
  private lockSource = new BehaviorSubject<Lock[]>([]);
  locks$ = this.lockSource.asObservable();

  constructor(private httpClient: HttpClient) {}

  fetchAllLocks(): void {
    const options = getJwtRequestOptions();
    if (options != null) {
      this.httpClient
        .get<ResponseWithLocks>(this.endpoint + '/api/admin/getall', options)
        .pipe(
          catchError((err: any) => {
            return of(err);
          })
        )
        .subscribe((response: ResponseWithLocks) => {
          this.lockSource.next(response.locks);
        });
    }
  }
}