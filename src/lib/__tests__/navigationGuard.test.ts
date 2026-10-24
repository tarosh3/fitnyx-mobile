import { guardNavigation, NAV_LOCK_MS } from '../navigationGuard';

function fakeRouter() {
  return { push: jest.fn(), navigate: jest.fn(), back: jest.fn(), dismiss: jest.fn() };
}

it('drops a second push within the lock window, then lets the next one through', () => {
  let t = 1000;
  const r = fakeRouter();
  const push = r.push;
  guardNavigation(r, () => t);

  r.push('/workouts/session/1');
  r.push('/workouts/session/1');
  t += 100;
  r.navigate('/arena');
  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith('/workouts/session/1');

  t += NAV_LOCK_MS;
  r.push('/arena');
  expect(push).toHaveBeenCalledTimes(2);
});

it('locks back separately from push', () => {
  let t = 1000;
  const r = fakeRouter();
  const { push, back, dismiss } = r;
  guardNavigation(r, () => t);

  r.push('/x');
  r.back();
  r.back();
  r.dismiss();
  expect(push).toHaveBeenCalledTimes(1);
  expect(back).toHaveBeenCalledTimes(1);
  expect(dismiss).not.toHaveBeenCalled();

  t += NAV_LOCK_MS;
  r.dismiss();
  expect(dismiss).toHaveBeenCalledTimes(1);
});

it('installs once', () => {
  let t = 1000;
  const r = fakeRouter();
  const push = r.push;
  guardNavigation(r, () => t);
  const wrapped = r.push;
  guardNavigation(r, () => t);
  expect(r.push).toBe(wrapped);
  r.push('/a');
  expect(push).toHaveBeenCalledTimes(1);
});
