/**
 * Adapted from the official async pipe at https://github.com/angular/angular/blob/master/packages/common/src/pipes/async_pipe.ts
 * Use this to subscribe to infinite Observables (like ones based on a timer), to prevent protractor from timing out.
 * The Observable will run outside of the zone, but the subscription will still affect the template.
 */
import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, WrappedValue, NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ISubscription } from 'rxjs/Subscription';

/**
 * @ngModule CommonModule
 * @whatItDoes Unwraps a value from an asynchronous primitive.
 * @howToUse `observable_or_promise_expression | async`
 * @description
 * The `async` pipe subscribes to an `Observable` or `Promise` and returns the latest value it has
 * emitted. When a new value is emitted, the `async` pipe marks the component to be checked for
 * changes. When the component gets destroyed, the `async` pipe unsubscribes automatically to avoid
 * potential memory leaks.
 *
 *
 * ## Examples
 *
 * This example binds a `Promise` to the view. Clicking the `Resolve` button resolves the
 * promise.
 *
 * {@example common/pipes/ts/async_pipe.ts region='AsyncPipePromise'}
 *
 * It's also possible to use `async` with Observables. The example below binds the `time` Observable
 * to the view. The Observable continuously updates the view with the current time.
 *
 * {@example common/pipes/ts/async_pipe.ts region='AsyncPipeObservable'}
 *
 * @stable
 */
@Pipe({ name: 'zonedAsync', pure: false })
export class ZonedAsyncPipe implements OnDestroy, PipeTransform {
  private _latestValue: any = null;
  private _latestReturnedValue: any = null;

  private _subscription: ISubscription | null = null;
  private _obj: Observable<any> | null = null;

  constructor(private _ref: ChangeDetectorRef, private ngZone: NgZone) { }

  ngOnDestroy(): void {
    if (this._subscription) {
      this._dispose();
    }
  }

  transform<T>(obj: null): null;
  transform<T>(obj: undefined): undefined;
  transform<T>(obj: Observable<T> | null | undefined): T | null;
  transform(obj: Observable<any> | null | undefined): any {
    if (!this._obj) {
      if (obj) {
        this._subscribe(obj);
      }
      this._latestReturnedValue = this._latestValue;
      return this._latestValue;
    }

    if (obj !== this._obj) {
      this._dispose();
      return this.transform(obj as any);
    }

    if (this._latestValue === this._latestReturnedValue) {
      return this._latestReturnedValue;
    }

    this._latestReturnedValue = this._latestValue;
    return WrappedValue.wrap(this._latestValue);
  }

  private _subscribe(obj: Observable<any>): void {
    this._obj = obj;
    this._subscription =

    // We must set up the subscription outside of the ngZone, because otherwise
    // the endless Observable will prevent the ngZone from becoming stable and thus blocking all e2e tests
    // refer to http://www.protractortest.org/#/timeouts
      this.ngZone.runOutsideAngular(() =>
        obj.subscribe(
          value => this.ngZone.run(() => this._updateLatestValue(obj, value)),
          e => { throw e; }
        )
      );
  }

  private _dispose(): void {
    this._subscription.unsubscribe();
    this._latestValue = null;
    this._latestReturnedValue = null;
    this._subscription = null;
    this._obj = null;
  }

  private _updateLatestValue(async: any, value: Object): void {
    if (async === this._obj) {
      this._latestValue = value;
      this._ref.markForCheck();
    }
  }
}
