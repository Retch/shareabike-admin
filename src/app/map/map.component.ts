import * as L from 'leaflet';
import {AfterViewInit, Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {of, Subscription, timer} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {CrudService} from '../shared/services/crud/crud.service';
import {lockCoordinatesToLatLngExpression} from '../shared/utils/gpsUtils';
import {Lock} from '../types/Lock';
import {timeStampToDateString} from '../shared/utils/timeUtil';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css'],
})
export class MapComponent implements AfterViewInit {
  private map: L.Map | undefined;
  private lockMarkerLayer: L.LayerGroup | undefined;
  private lockSubscription: Subscription | undefined;
  private timerSubscription: Subscription | undefined;
  private defaultLocation: L.LatLngExpression = [50.985, 11.04];
  private wasCenterModified = false;
  private markerIconSize: L.PointExpression = [35, 35];

  private lockLockedIcon = L.icon({
    iconUrl: 'assets/lock.webp',
    iconSize: this.markerIconSize,
    popupAnchor: [0, -15],
  });

  private lockAlertLockedIcon = L.icon({
    iconUrl: 'assets/lock-alert.webp',
    iconSize: this.markerIconSize,
    popupAnchor: [0, -15],
  });

  private lockAlertOpenIcon = L.icon({
    iconUrl: 'assets/lock-open-alert.webp',
    iconSize: this.markerIconSize,
    popupAnchor: [0, -15],
  });

  private lockOpenIcon = L.icon({
    iconUrl: 'assets/lock-open.webp',
    iconSize: this.markerIconSize,
    popupAnchor: [0, -15],
  });

  private lockQuestionIcon = L.icon({
    iconUrl: 'assets/lock-question.webp',
    iconSize: this.markerIconSize,
    popupAnchor: [0, -15],
  });

  private initMap(): void {
    this.map = L.map('map').setView(this.defaultLocation, 13);

    const tiles = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        minZoom: 3,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    );
    tiles.addTo(this.map);
  }

  constructor(public crudService: CrudService) {
  }

  ngOnInit() {
    this.lockSubscription = this.crudService.locks$.subscribe(
      (locks: Lock[]) => {
        let mapCenter = this.defaultLocation;
        this.lockMarkerLayer?.clearLayers();
        if (this.map != null) {
          this.setMapMarkers(locks);
        }
        if (!this.wasCenterModified) {
          this.setMapCenter(mapCenter);
        }
      }
    );
    this.crudService.fetchAllLocks();
    this.timerSubscription = timer(0, 10000)
      .pipe(
        switchMap(() => {
          this.crudService.fetchAllLocks();
          return of();
        })
      )
      .subscribe();
  }

  setMapCenter(center: L.LatLngExpression) {
    this.map?.setView(center, 13);
    this.wasCenterModified = true;
  }

  setMapMarkers(locks: Lock[]) {
    if (this.lockMarkerLayer == null) {
      this.lockMarkerLayer = L.layerGroup().addTo(this.map!);
    } else {
      this.lockMarkerLayer.clearLayers();
      for (let lock of locks) {
        const position: L.LatLngExpression | null = lockCoordinatesToLatLngExpression(lock);
        if (position != null) {
          let icon = this.lockLockedIcon;
          const isAlerted = lock.lastEvent != null;
          switch (lock.isLocked) {
            case true:
              icon = isAlerted
                ? this.lockAlertLockedIcon
                : this.lockLockedIcon;
              break;
            case false:
              icon = isAlerted ? this.lockAlertOpenIcon : this.lockOpenIcon;
              break;
            default:
              icon = this.lockQuestionIcon;
          }
          const marker = L.marker(position, {
            icon: icon,
          }).addTo(this.lockMarkerLayer!);
          marker.bindPopup(
            '<b>Lock ' +
            lock.id +
            ' (' +
            lock.lockTypeDescription +
            ')' +
            '</b><br />ID: ' +
            lock.deviceId +
            '<br />QR Code: ' +
            lock.qrCodeContent +
            '<br />Battery: ' +
            lock.batteryPercentage +
            ' %' +
            '<br />Cellular Signal Quality: ' +
            lock.cellularSignalQualityPercentage +
            ' %<br />Last Contact: ' +
            timeStampToDateString(lock.lastContactUtcTimestamp ?? 0) +
            '<br />Last Position: ' +
            timeStampToDateString(lock.lastPositionTimeUtcTimestamp ?? 0) +
            '<br />Satellites: ' +
            lock.satellites +
            '<br />GPS signal: ' +
            (lock.noGps ? 'no' : 'yes') +
            '<br />' +
            (lock.lastEvent != null
              ? 'Last event: ' +
              lock.lastEvent +
              ' (' +
              timeStampToDateString(lock.lastEventUtcTimestamp!) +
              ')'
              : '')
          );
        }
      }
    }
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy() {
    this.lockSubscription!.unsubscribe();
    this.timerSubscription!.unsubscribe();
  }
}
