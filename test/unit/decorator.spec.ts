import { Container } from "aurelia-framework";
import "rxjs/add/operator/pluck";

import { Store } from "../../src/store";
import { connectTo } from "../../src/decorator";
import { Subscription } from "rxjs/Subscription";

interface DemoState {
  foo: string;
  bar: string;
}

function arrange() {
  const initialState = { foo: "Lorem", bar: "Ipsum" };
  const store: Store<DemoState> = new Store(initialState);
  const container = new Container().makeGlobal();
  container.registerInstance(Store, store);

  return { initialState, store };
}

describe("using decorators", () => {
  it("should be possible to decorate a class and assign the subscribed result to the state property", () => {
    const { store, initialState } = arrange();

    @connectTo()
    class DemoStoreConsumer {
      state: DemoState;
    }

    const sut = new DemoStoreConsumer();
    expect(sut.state).toEqual(undefined);

    (sut as any).bind();

    expect(sut.state).toEqual(initialState);
    expect((sut as any)._stateSubscription).toBeDefined();
  });

  it("should be possible to provide a state selector", () => {
    const { store, initialState } = arrange();

    @connectTo<DemoState>((store) => store.state.pluck("bar"))
    class DemoStoreConsumer {
      state: DemoState;
    }

    const sut = new DemoStoreConsumer();
    expect(sut.state).toEqual(undefined);

    (sut as any).bind();

    expect(sut.state).toEqual(initialState.bar);
  });

  describe("with a complex settings object", () => {
    it("should be possible to provide a selector", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        selector: (store) => store.state.pluck("bar")
      })
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();
      expect(sut.state).toEqual(undefined);

      (sut as any).bind();

      expect(sut.state).toEqual(initialState.bar);
    });

    it("should use the default state observable if selector does not return an observable", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        selector: () => "foobar" as any
      })
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();
      expect(sut.state).toEqual(undefined);

      (sut as any).bind();

      expect(sut.state).toEqual(initialState);
    });

    it("should be possible to override the target property", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        selector: (store) => store.state.pluck("bar"),
        target: "foo"
      })
      class DemoStoreConsumer {
        foo: DemoState;
      }

      const sut = new DemoStoreConsumer();
      expect(sut.foo).toEqual(undefined);

      (sut as any).bind();

      expect(sut.foo).toEqual(initialState.bar);
    });
  })

  it("should use the default state subscription if provided selector returns no observable", () => {
    const { store, initialState } = arrange();

    @connectTo<DemoState>((store) => "foobar" as any)
    class DemoStoreConsumer {
      state: DemoState;
    }

    const sut = new DemoStoreConsumer();

    (sut as any).bind();

    expect(sut.state).toEqual(initialState);
  });

  it("should apply original bind method after patch", () => {
    const { store, initialState } = arrange();

    @connectTo()
    class DemoStoreConsumer {
      state: DemoState;
      test = "";

      public bind() {
        this.test = "foobar";
      }
    }

    const sut = new DemoStoreConsumer();

    (sut as any).bind();

    expect(sut.state).toEqual(initialState);
    expect(sut.test).toEqual("foobar");
  });

  describe("the unbind lifecycle-method", () => {
    it("should apply original unbind method after patch", () => {
      const { store, initialState } = arrange();

      @connectTo()
      class DemoStoreConsumer {
        state: DemoState;
        test = "";

        public unbind() {
          this.test = "foobar";
        }
      }

      const sut = new DemoStoreConsumer();

      (sut as any).bind();

      expect(sut.state).toEqual(initialState);

      (sut as any).unbind();

      expect(sut.test).toEqual("foobar");
    });

    it("should automatically unsubscribe when unbind is called", () => {
      const { store, initialState } = arrange();

      @connectTo()
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();
      expect(sut.state).toEqual(undefined);

      (sut as any).bind();
      const subscription = ((sut as any)._stateSubscription as Subscription);
      spyOn(subscription, "unsubscribe").and.callThrough();

      expect(sut.state).toEqual(initialState);
      expect(subscription.closed).toBe(false);

      (sut as any).unbind();

      expect(subscription).toBeDefined();
      expect(subscription.closed).toBe(true);
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });

    it("should not unsubscribe if subscription is already closed", () => {
      const { store, initialState } = arrange();

      @connectTo()
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();
      expect(sut.state).toEqual(undefined);

      (sut as any).bind();
      const subscription = ((sut as any)._stateSubscription as Subscription);
      subscription.unsubscribe();

      expect(sut.state).toEqual(initialState);
      expect(subscription.closed).toBe(true);

      spyOn(subscription, "unsubscribe");

      (sut as any).unbind();

      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe("with custom setup and teardown settings", () => {
    it("should return the value from the original setup / teardown functions", () => {
      const { store, initialState } = arrange();
      const expectedBindResult = "foo";
      const expectedUnbindResult = "bar";

      @connectTo<DemoState>({
        selector: (store) => store.state
      })
      class DemoStoreConsumer {
        state: DemoState;

        public bind() {
          return expectedBindResult;
        }

        public unbind() {
          return expectedUnbindResult;
        }
      }

      const sut = new DemoStoreConsumer();

      expect(sut.bind()).toBe(expectedBindResult);
      expect(sut.unbind()).toBe(expectedUnbindResult);
    });

    it("should allow to specify a lifecycle hook for the subscription", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        selector: (store) => store.state,
        setup: "created"
      })
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();

      expect((sut as any).created).toBeDefined();
      (sut as any).created();

      expect(sut.state).toEqual(initialState);
      expect((sut as any)._stateSubscription).toBeDefined();
    });

    it("should allow to specify a lifecycle hook for the unsubscription", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        selector: (store) => store.state,
        teardown: "detached"
      })
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();

      (sut as any).bind();

      const subscription = ((sut as any)._stateSubscription as Subscription);
      spyOn(subscription, "unsubscribe").and.callThrough();

      expect(sut.state).toEqual(initialState);
      expect(subscription.closed).toBe(false);
      expect((sut as any).detached).toBeDefined();
      (sut as any).detached();

      expect(subscription).toBeDefined();
      expect(subscription.closed).toBe(true);
      expect(subscription.unsubscribe).toHaveBeenCalled();
    });
  });

  describe("with settings declaring onChanged", () => {
    it("should accept a string and call the respective handler passing the new state", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        onChanged: "stateChanged",
        selector: (store) => store.state,
      })
      class DemoStoreConsumer {
        state: DemoState;

        stateChanged(state: DemoState) { /**/ }
      }

      const sut = new DemoStoreConsumer();
      spyOn(sut, "stateChanged");
      (sut as any).bind();

      expect(sut.state).toEqual(initialState);
      expect(sut.stateChanged).toHaveBeenCalledWith(initialState);
    });

    it("should be called before assigning the new state, so there is still access to the previous state", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        onChanged: "stateChanged",
        selector: (store) => store.state,
      })
      class DemoStoreConsumer {
        state: DemoState;

        stateChanged(state: DemoState) {
          expect(sut.state).toEqual(undefined);
          expect(state).toEqual(initialState);
        }
      }

      const sut = new DemoStoreConsumer();
      (sut as any).bind();
    });

    it("should check whether the method exists before calling it and throw a meaningful error", () => {
      const { store, initialState } = arrange();

      @connectTo<DemoState>({
        onChanged: "stateChanged",
        selector: (store) => store.state,
      })
      class DemoStoreConsumer {
        state: DemoState;
      }

      const sut = new DemoStoreConsumer();

      expect(() => (sut as any).bind()).toThrowError("Provided onChanged handler does not exist on target VM");
    });
  });
});
