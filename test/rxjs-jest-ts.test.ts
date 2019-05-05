import { asyncScheduler, Observable, scheduled, using } from 'rxjs';
import { delay, filter, map, switchMap } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';

describe('Leaning Marbles', () => {
  let scheduler: TestScheduler

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  it('should compare test source$ with test expected$', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = cold('-a-|')
      const expected$ = '   -a-|'
      const subs = '        ^--!'

      expectObservable(source$).toBe(expected$)
      expectSubscriptions(source$.subscriptions).toBe(subs)
    })
  })

  it('should compare real source$ with test expected$', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = scheduled(['1'], asyncScheduler)
      const marbleSource$ = cold('(1|)')
      const expected$ = '         (1|)'
      const subs = '              (^!)'

      expectObservable(source$).toBe(expected$)
      expectObservable(marbleSource$).toBe(expected$)
      expectSubscriptions(marbleSource$.subscriptions).toBe(subs)
    })
  })

  it('should pipe map test source$', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = cold('-a-|', { a: 5 })
      const expected$ = '   -x-|'
      const subs = '        ^--!'

      const result$ = source$.pipe(map(a => a * 2))

      expectObservable(result$).toBe(expected$, { x: 10 })
      expectSubscriptions(source$.subscriptions).toBe(subs)
    })
  })

  it('should pipe map real source$', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = scheduled([5], asyncScheduler)
      const marbleSource$ = cold('(a|)', { a: 10 })
      const expected$ = '         (x|)'
      const subs = '              (^!)'

      const result$ = source$.pipe(map(a => a * 2))

      expectObservable(result$).toBe(expected$, { x: 10 })
      expectObservable(marbleSource$).toBe(expected$, { x: 10 })
      expectSubscriptions(marbleSource$.subscriptions).toBe(subs)
    })
  })

  it('should handle a test error', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = cold('a')
      const expected$ = '   #'
      const subs = '     (^!)'

      const result$ = source$.pipe(
        switchMap(() => {
          throw new Error()
        })
      )

      expectObservable(result$).toBe(expected$, undefined, new Error())
      expectSubscriptions(source$.subscriptions).toBe(subs)
    })
  })

  it('should handle real a error', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source$ = scheduled([1, 2, 3, 4, 5], asyncScheduler)
      const marbleSource$ = cold('(abcde)', { a: 1, b: 2, c: 3, d: 4, f: 5 })
      const expected$ = '   500ms (a-b-#)'
      const subs = '        ^   499ms   !'

      const result$ = (obs$: Observable<number>) =>
        obs$.pipe(
          delay(500),
          map(a => {
            if (a === 3) {
              throw new Error()
            }
            return a
          })
        )

      expectObservable(result$(source$)).toBe(expected$, { a: 1, b: 2 }, new Error())
      expectObservable(result$(marbleSource$)).toBe(expected$, { a: 1, b: 2 }, new Error())
      expectSubscriptions(marbleSource$.subscriptions).toBe(subs)
    })
  })

  it('should handle multiple test source$(s) with one subscription', () => {
    scheduler.run(({ cold, expectObservable, expectSubscriptions }) => {
      const source1$ = cold('-a-b-c-|')
      const expected1$ = '   -----c-|'

      const source2$ = cold('-d-e-f-|')
      const expected2$ = '   ---e---|'
      const subs = '         ^------!'

      const result1$ = source1$.pipe(filter(val => val === 'c'))
      const result2$ = using(
        () => result1$.subscribe(),

        () => source2$.pipe(filter(val => val === 'e'))
      )

      expectObservable(result1$).toBe(expected1$)
      expectObservable(result2$).toBe(expected2$)
      expectSubscriptions(source2$.subscriptions).toBe(subs)
    })
  })
})
