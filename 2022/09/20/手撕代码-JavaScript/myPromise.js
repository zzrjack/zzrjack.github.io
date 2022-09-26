class myPromise {
  //定义promise的三个状态
  static PENDING = "pending";
  static FULFILLED = "fulfilled";
  static REJECTED = "rejected";
  constructor(func) {
    this.status = myPromise.PENDING;
    //执行resolve和reject会给结果的，所以这先赋值一个null
    this.result = null;
    this.reason = null;
    this.value = null;
    this.onFulfilledCallbacks = []; // 保存成功回调
    this.onRejectedCallbacks = []; // 保存失败回调
    try {
      //func(this.resolve.bind(this), this.reject.bind(this));
      //这里的this.reject意思是：把类方法reject()作为参数 传到构造函数constructor 里要执行的func()方法里
      //只是一个参数，并不执行，只有创建实例后调用reject()方法的时候才执行，此时this的指向已经变了
      //所以想要正确调用myPromise的reject()方法就要通过.bind(this))改变this指向。
      func(this.resolve.bind(this), this.reject.bind(this));
    } catch (error) {
      //直接在构造函数里执行类方法，this指向不变
      //this.reject()就是直接调用类方法reject()，所以不用再进行this绑定。
      this.reject(error);
    }
  }
  //依据自身的状态属性进行判断和变动
  resolve(value) {
    if (this.status === myPromise.PENDING) {
      this.status = myPromise.FULFILLED;
      this.result = value;
      //遍历自身的callbacks数组，看看数组里面有没有then那边保留过来的待执行函数
      //然后逐个执行数组里面的函数，执行的时候会传入相应的参数：
      this.onFulfilledCallbacks.forEach((callback) => {
        callback(value);
      });
    }
  }
  reject(reason) {
    if (this.status === myPromise.PENDING) {
      this.status = myPromise.REJECTED;
      this.result = reason;
      this.onRejectedCallbacks.forEach((callback) => {
        callback(reason);
      });
    }
  }
  //then 为创建实例后调用then方法可以传入两个参数。
  //这两个参数都是函数，一个是当状态为fulfilled 成功 时执行的代码，另一个是当状态为 rejected 拒绝 时执行的代码。
  //设置为onFulfilled,onRejected
  then(onFulfilled, onRejected) {
    let promise2 = new myPromise((resolve, reject) => {
      //如果当前实例的 status状态属性为 FUFILLED 成功 的话
      //执行传进来的 onFulfiled 函数，并且为onFulfiled函数传入前面保留的status属性值：
      if (this.status === myPromise.FULFILLED) {
        setTimeout(() => {
          try {
            //如果 onFulfilled 不是函数且 promise1 成功执行， promise2 必须成功执行并返回相同的值
            if (typeof onFulfilled !== "function") {
              resolve(this.result);
            } else {
              let x = onFulfilled(this.result);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (e) {
            //如果 onFulfilled 或者 onRejected 抛出一个异常 e ，则 promise2 必须拒绝执行，并返回拒因 e
            reject(e);
          }
        });
      }
      //同理可得rejected
      else if (this.status === myPromise.REJECTED) {
        setTimeout(() => {
          try {
            if (typeof onRejected !== "function") {
              reject(this.result);
            } else {
              let x = onRejected(this.result);
              resolvePromise(promise2, x, resolve, reject);
            }
          } catch (e) {
            reject(e);
          }
        });
      }
      //当then里面判断到 pending 待定状态时
      //resolve或者reject还没获取到任何值，所以我们得让then里的函数稍后再执行，等resolve执行了以后，再执行then
      //确保onFulfilled和onRejected方法异步执行
      //应该在then方法被调用的那一轮事件循环之后的新执行栈中执行。
      //因此，在保存成功和失败回调时也要添加 setTimeout
      else if (this.status === myPromise.PENDING) {
        this.onFulfilledCallbacks.push(() => {
          setTimeout(() => {
            try {
              if (typeof onFulfilled !== "function") {
                resolve(this.result);
              } else {
                let x = onFulfilled(this.result);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (error) {
              reject(error);
            }
          });
        });
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              if (typeof onRejected !== "function") {
                reject(this.result);
              } else {
                let x = onRejected(this.result);
                resolvePromise(promise2, x, resolve, reject);
              }
            } catch (error) {
              reject(error);
            }
          });
        });
      }
    });
    return promise2;
  }
}
//------------------------------------------------------------------------------------------------------
//promise解决函数
function resolvePromise(promise2, x, resolve, reject) {
  if (x === promise2) {
    throw new TypeError("Chaining cycle detected for promise");
  }
  if (x instanceof myPromise) {
    //如果 x 为 Promise ，则使 promise2 接受 x 的状态也就是继续执行x，如果执行的时候拿到一个y，还要继续解析y
    x.then((y) => {
      resolvePromise(promise2, y, resolve, reject);
    }, reject);
  } else if (x !== null && (typeof x === "object" || typeof x === "function")) {
    //如果x是函数或者对象
    try {
      var then = x.then;
    } catch (error) {
      return reject(error);
    }
    //如果 resolvePromise 和 rejectPromise 均被调用，或者被同一参数调用了多次，则优先采用首次调用并忽略剩下的调用
    if (typeof then === "function") {
      let called = false;
      try {
        then.call(
          x,
          //如果 resolvePromise 以值 y 为参数被调用，则运行 [[Resolve]](promise, y)
          (y) => {
            if (called) {
              return;
            }
            called = true;
            resolvePromise(promise2, y, resolve, reject);
          },
          //如果 rejectPromise 以据因 r 为参数被调用，则以据因 r 拒绝 promise
          (r) => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } catch (error) {
        if (called) return;
        called = true;
        reject(error);
      }
    } else {
      //如果 then 不是函数，以 x 为参数执行 promise
      resolve(x);
    }
  } else {
    //如果 x 不为对象或者函数，以 x 为参数执行 promise
    return resolve(x);
  }
}
