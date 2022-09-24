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
  //设置为onFULFILLED,onREJECTED
  //参数校验，如果传入的参数不是函数就直接忽略
  //注意onREJECTED分支是错误分支所以传入的不是函数可以抛出错误
  then(onFULFILLED, onREJECTED) {
    onFULFILLED = typeof onFULFILLED === "function" ? onFULFILLED : (value) => value;
    onREJECTED =
      typeof onREJECTED === "function"
        ? onREJECTED
        : (reason) => {
            throw reason;
          };
    //当then里面判断到 pending 待定状态时我们要干什么？
    //此时resolve或者reject还没获取到任何值，所以我们得让then里的函数稍后再执行，等resolve执行了以后，再执行then
    if (this.status === myPromise.PENDING) {
      //确保onFulfilled和onRejected方法异步执行
      //应该在then方法被调用的那一轮事件循环之后的新执行栈中执行。
      //因此，在保存成功和失败回调时也要添加 setTimeout
      this.onFulfilledCallbacks.push(() => {
        setTimeout(() => {
          onFULFILLED(this.result);
        });
      });
      this.onRejectedCallbacks.push(() => {
        setTimeout(() => {
          onREJECTED(this.result);
        });
      });
    }
    //如果当前实例的 status状态属性为 FUFILLED 成功 的话
    //执行传进来的 onFUFILLED 函数，并且为onFULFILLED函数传入前面保留的status属性值：
    if (this.status === myPromise.FULFILLED) {
      setTimeout(() => {
        onFULFILLED(this.result);
      });
    }
    //同理可得rejected
    if (this.status === myPromise.REJECTED) {
      setTimeout(() => {
        onREJECTED(this.result);
      });
    }
  }
}
//------------------------------------------------------------------------------------------------------
console.log(1);
let promise1 = new myPromise((resolve, reject) => {
  console.log(2);
  setTimeout(() => {
    console.log("A", promise1.status);
    resolve("这次一定");
    console.log("B", promise1.status);
    console.log(4);
  });
});
promise1.then(
  (result) => {
    console.log("C", promise1.status);
    console.log("fulfilled:", result);
  },
  (reason) => {
    console.log("rejected:", reason);
  }
);
console.log(3);

const promise = new myPromise((resolve, reject) => {
  setTimeout(() => {
    resolve("success");
  }, 2000);
});
promise.then((value) => {
  console.log(1);
  console.log("resolve", value);
});
promise.then((value) => {
  console.log(2);
  console.log("resolve", value);
});
promise.then((value) => {
  console.log(3);
  console.log("resolve", value);
});
