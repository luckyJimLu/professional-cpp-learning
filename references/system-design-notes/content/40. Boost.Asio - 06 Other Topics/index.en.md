---
id: boost-asio-06-other-topics
title: "Chapter 6: Other Topics"
titleEn: "Chapter 6: Other Topics"
order: 40
category: specialized
description: "Advanced Boost.Asio facilities including steady/deadline timers, socket options, and composite buffer operations."
tags: ["Boost.Asio", "Timers", "Socket Options", "Composite Buffers", "UNIX Domain"]
---

# Chapter 6: Other Topics

In this chapter, we will cover the following recipes:

- Using composite buffers for scatter/gather operations

- Using timers

- Getting and setting socket options

- Performing a stream-based I/O

Introduction

This final chapter includes four recipes that stand somewhat apart from those in previous
chapters that demonstrate the core Boost.Asio concepts, covering the majority of typical
use cases. However, it does not mean that recipes demonstrated in this chapter are less
important. On the contrary, they are very important and even critical to specific cases.
However, they will be required less often in typical distributed applications.

Though most applications will not require scatter/gather I/O operations and composite
buffers, for some, which keep different parts of messages in separate buffers, such facilities
may turn out to be very usable and convenient.

The Boost.Asio timer is a powerful instrument that allows measuring time intervals. Often, this
is used to set deadlines for the operations that may last unpredictably long and to interrupt
those operations if they do not complete after running for a certain period of time. For many
distributed applications, such an instrument is critical, taking into account the fact that Boost.
Asio does not provide a way to specify a timeout for potentially long-running operations. In
addition to this, timers provided by Boost.Asio can be used to solve other tasks that are not
related to network communication.

Tools that allow getting and setting socket options are quite important as well. When
developing a simple network application, the developer may be fully satisfied with the socket
equipped with default values of the options that are automatically set during instantiation of
the socket object. However, in more sophisticated cases, it may be absolutely necessary to
reconfigure the socket by customizing the values of its options.

Boost.Asio classes that wrap the socket and provide a stream-like interface to it allow us to
create simple and elegant distributed applications. And simplicity is known to be one of the
key characteristics of a good software.

Now, let's move on to a detailed consideration of the mentioned topics.

Using composite buffers for scatter/gather
operations

The Using fixed-length I/O buffers recipe in Chapter 2, I/O Operations, introduces simple I/O
buffers, but only slightly touches upon scatter/gather operations and composite buffers. In
this recipe, we are going to consider this topic in more detail.

A composite buffer is basically a complex buffer that consists of two or more simple buffers
(contiguous blocks of memory) distributed over the process' address space. Such buffers
become especially handy in two situations.

The first situation is when the application needs a buffer either to store the message before
sending it to the remote application or to receive the message sent by the remote application.
The problem is that the size of the message is so big that allocating a single contiguous buffer
that is sufficient to store it may fail due to the process' address space fragmentation. In this
case, allocating multiple smaller buffers, whose sizes when summed would be enough to
store the data, and combining them in a single composite buffer is a good solution to
the problem.

Another situation is actually the first one inverted. Due to specificity of the design of the
application, the message to be sent to the remote application is broken into several parts and
stored in different buffers, or if the message to be received from the remote application needs
to be broken into several parts, each of which should be stored in a separate buffer for further
processing. In both the cases, combining several buffers into one composite buffer and then
using scatter send or gather receive operations would be a good approach to the problem.

In this recipe, we will see how to create composite buffers and use them in scatter/gather
I/O operations.

### Getting ready…

To understand the content presented in this recipe, it is desirable to be familiar with the
content of the Using fixed-length I/O buffers recipe in Chapter 2, I/O Operations, that provides
a general overview of Boost.Asio's fixed length I/O buffers. Therefore, it is recommended to
get acquainted with the Using fixed-length I/O buffers recipe before proceeding with this one.

### How to do it…

Let's consider two algorithms and corresponding code samples that describe how to create
and prepare a composite buffer that is to be used with Boost.Asio I/O operations. The first
algorithm deals with the composite buffer intended for use in gather output operations and
the second one for scatter input operations.

Preparing a composite buffer for gather output operations
The following is the algorithm and corresponding code sample that describe how to prepare
the composite buffer that is to be used with the socket's method that performs output
operations such as asio::ip::tcp::socket::send() or a free function such as
```cpp
asio::write():
```

1.  Allocate as many memory buffers as needed to perform the task at hand. Note that

this step does not involve any functionality or data types from Boost.Asio.

2.  Fill the buffers with data to be output.

3.  Create an instance of a class that satisfies the ConstBufferSequence
or MultipleBufferSequence concept's requirements, representing a
composite buffer.

4.  Add simple buffers to the composite buffer. Each simple buffer should be represented
as an instance of the asio::const_buffer or asio::mutable_buffer classes.

5.  The composite buffer is ready to be used with Boost.Asio output functions.

Let's say we want to send a string Hello my friend! to the remote application, but our
message was broken into three parts and each part was stored in a separate buffer. What
we can do is represent our three buffers as a composite buffer, and then, use it in the output
operation. This is how we will do it in the following code:

```cpp
#include <boost/asio.hpp>

using namespace boost;

int main()
{
  // Steps 1 and 2. Create and fill simple buffers.
  const char* part1 = "Hello ";

  const char* part2 = "my ";
  const char* part3 = "friend!";

  // Step 3. Create an object representing a composite buffer.
  std::vector<asio::const_buffer> composite_buffer;

  // Step 4. Add simple buffers to the composite buffer.
  composite_buffer.push_back(asio::const_buffer(part1, 6));
  composite_buffer.push_back(asio::const_buffer(part2, 3));
  composite_buffer.push_back(asio::const_buffer(part3, 7));

  // Step 5. Now composite_buffer can be used with Boost.Asio
  // output operations as if it was a simple buffer represented
  // by contiguous block of memory.

  return 0;
}

Preparing a composite buffer for an input operation
```

The following is the algorithm and corresponding code sample that describe how to prepare
the composite buffer that is to be used with the socket's method that performs an input
operation such as asio::ip::tcp::socket::receive() or a free function such as
```cpp
asio::read():
```

1.  Allocate as many memory buffers as required to perform the task at hand. The sum
of the sizes of the buffers must be equal to or greater than the size of the expected
message to be received in these buffers. Note that this step does not involve any
functionalities or data types from Boost.Asio.

2.  Create an instance of a class that satisfies the MutableBufferSequence concept's

requirements that represents a composite buffer.

3.  Add simple buffers to the composite buffer. Each simple buffer should be represented

as an instance of the asio::mutable_buffer class.

4.  The composite buffer is ready to be used with Boost.Asio input operations.

Let's imagine a hypothetical situation, where we want to receive 16 bytes long messages from
the server. However, we do not have a buffer that can fit the entire message. Instead, we have
three buffers: 6, 3, and 7 bytes long. To create a buffer in which we can receive 16 bytes of
data, we can join our three small buffers into a composite one. This is how we do it in the
following code:

```cpp
#include <boost/asio.hpp>

using namespace boost;

int main()
{
  // Step 1. Allocate simple buffers.
  char part1[6];
  char part2[3];
  char part3[7];

  // Step 2. Create an object representing a composite buffer.
  std::vector<asio::mutable_buffer> composite_buffer;

  // Step 3. Add simple buffers to the composite buffer object.
  composite_buffer.push_back(asio::mutable_buffer(part1,
  sizeof(part1)));
  composite_buffer.push_back(asio::mutable_buffer(part2,
  sizeof(part2)));
  composite_buffer.push_back(asio::mutable_buffer(part3,
  sizeof(part3)));

  // Now composite_buffer can be used with Boost.Asio
  // input operation as if it was a simple buffer
  // represented by contiguous block of memory.

  return 0;
}

```

### How it works…

Let's see how the first sample works. It starts with allocating three read-only buffers that are
filled with parts of the message string Hello my friend!.

In the next step, an instance of the std::vector<asio::const_buffer> class is created,
which is the embodiment of the composite buffer. The instance is given the corresponding
```cpp
name, composite_buffer. Because the  std::vector<asio::const_buffer> class
```

satisfies the requirements of ConstBufferSequence, its objects can be used as composite
buffers and can be passed to Boost.Asio gather output functions and methods as arguments
that represent the data source.

In step 4, each of our three buffers is represented as an instance of the asio::const_
buffer class and added to the composite buffer. Because all Boost.Asio output functions
and methods that work with fixed-sized buffers are designed to work with composite buffers
as well, our composite_buffer object can be used with them like a simple buffer.

The second sample works quite similar to the first one. The only difference is that because the
composite buffer created in this sample is intended to be used as a data destination (rather
than a data source as it is in the first sample), the three simple buffers added to it are created
as writable ones and are represented as instances of the asio::mutable_buffer class
when added to the composite buffer.

Another thing to note about the second sample is that because the composite buffer created
in this sample is composed of mutable buffers, it can be used in both gather output and
scatter input operations. In this particular sample, the initial buffers (part1, part2, and
part3) are not filled with any data and they contain garbage; and therefore, using them in
output operations is senseless unless they are filled with meaningful data.

### See also

- The Using fixed-length I/O buffers recipe in Chapter 2, I/O Operations, provides more

information on fixed size simple buffers

- The Using extensible stream-oriented I/O buffers recipe in Chapter 2, I/O Operations,
demonstrates how to use classes provided by Boost.Asio, representing different types
of buffers—extensible buffers

Using timers

Timing is a very important aspect of software systems in general and distributed applications
in particular. Therefore a hardware timer—a device used to measure time intervals—is
essential component of any computer and all modern operating systems provide interface
allowing applications to use it.

There are two typical use cases related to the timer. The first one assumes that the
application wants to know the current time and asks the operating system to find it out.
The second use case is when the application asks the operating system to notify it (usually,
by means of invoking a callback) when a certain amount of time elapses.

The second use case is particularly important when it comes to developing distributed
applications with Boost.Asio because a timer is the only way to implement the timeout
mechanism for asynchronous operations.

The Boost.Asio library includes several classes that implement timers, which we will consider
in this recipe.

### How to do it…

The Boost.Asio library provides two template classes that implement timers. One of them is
asio::basic_deadline_timer<>, which was the only one available before Boost.Asio
## 1.49 version was released. In version 1.49, the second timer asio::basic_waitable_

timer<> class template was introduced.

The asio::basic_deadline_timer<> class template was designed to be compatible with
the Boost.Chrono library and internally relies on the functionality it provides. This template
class is somewhat outdated and provides a limited functionality. Therefore, we will not
consider it in this recipe.

On the contrary, a newer asio::basic_waitable_timer<> class template, which is
compatible with the C++11 chrono library is more flexible and provides more functionalities.
Boost.Asio includes three typedefs for classes that are generically derived from the
```cpp
asio::basic_waitable_timer<> template class:

typedef basic_waitable_timer< std::chrono::system_clock >
```

   system_timer;
```cpp
typedef basic_waitable_timer< std::chrono::steady_clock >
```

   steady_timer;
```cpp
typedef basic_waitable_timer< std::chrono::high_resolution_clock >
```

   high_resolution_timer;

The asio::system_timer class is based on the std::chrono::system_clock class,
which represents a system-wide real-time clock. This clock (and so is the timer) is influenced
by external changes of the current system time. Therefore, the asio::system_timer class
is a good choice when we need to set up a timer that will notify us when a certain absolute
time point is reached (for instance, 13h:15m:45s), taking into account the system clock shifts
made after the timer was set up. However, this timer is not good at measuring time intervals
(for instance, 35 seconds from now) because the system clock shifts may result in the timer
expiring sooner or later than the actual interval elapses.

The asio::steady_timer class is based on the std::chrono::steady_clock class,
which represents a steady clock that is not influenced by the system clock changes. It means
that asio::steady_timer is a good choice to measure intervals.

The last timer asio::high_resolution_timer class is based on the
```cpp
std::chrono::high_resolution_clock class, which represents a high-resolution
```

system clock. It can be used in cases when high precision in time measurement is required.

In distributed applications implemented with the Boost.Asio library, timers are usually used
to implement timeout periods for asynchronous operations. Just after the asynchronous
operation starts (for example, asio::async_read()), the application will start a timer
set up to expire after a certain period of time, a timeout period. When the timer expires, the
application checks whether the asynchronous operation has completed and if it has not, the
operation is considered timed out and is canceled.

Because a steady timer is not influenced by the system clock shifts, it is the best fit to
implement the timeout mechanism.

Note that on some platforms, steady clocks are not available and the
```cpp
corresponding class that represents a std::chrono::steady_clock
```

exhibits behavior that is identical to that of std::chrono::stystem_
clock, which means that just like the latter, it is influenced by the changes
of the system clock. It is advised to refer to the documentation of the platform
and corresponding C++ standard library implementation to find out whether
the steady clock is actually steady.

Let's consider a somewhat unrealistic but representative sample application that
demonstrates how to create, start, and cancel Boost.Asio timers. In our sample, we
will create and start two steady timers one by one. When the first timer expires, we
will cancel the second one, before it has a chance to expire.

We begin our sample application with including the necessary Boost.Asio headers and the
using directive:

```cpp
#include <boost/asio/steady_timer.hpp>
#include <iostream>

using namespace boost;
```

Next, we define the only component in our application: the main() entry point function:

```cpp
int main()
{
```

Like almost any nontrivial Boost.Asio application, we need an instance of the
```cpp
asio::io_service class:

  asio::io_service ios;
```

Then, we create and start the first t1 timer, which is set up to expire in 2 seconds:

```cpp
  asio::steady_timer t1(ios);
  t1.expires_from_now(std::chrono::seconds(2));
```

Then, we create and start the second t2 timer, which is set up to expire in 5 seconds.
It should definitely expire later than the first timer:

```cpp
  asio::steady_timer t2(ios);
  t2.expires_from_now(std::chrono::seconds(5));
```

Now, we define and set a callback function that is to be called when the first timer expires:

```cpp
   t1.async_wait([&t2](boost::system::error_code ec) {
      if (ec == 0) {
         std::cout << "Timer #2 has expired!" << std::endl;
      }
      else if (ec == asio::error::operation_aborted) {
         std::cout << "Timer #2 has been cancelled!"
                     << std::endl;
      }
      else {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message()
                      << std::endl;
      }

      t2.cancel();
   });
```

Then, we define and set another callback function that is to be called when the
second timer expires:

```cpp
   t2.async_wait([](boost::system::error_code ec) {
      if (ec == 0) {
         std::cout << "Timer #2 has expired!" << std::endl;
      }
      else if (ec == asio::error::operation_aborted) {
         std::cout << "Timer #2 has been cancelled!"
<< std::endl;
      }
      else {
         std::cout << "Error occured! Error code = "
            << ec.value()
            << ". Message: " << ec.message()
<< std::endl;
      }
   });
```

In the last step, we call the run() method on the instance of the asio::io_service class:

```cpp
  ios.run();

  return 0;
}
```

Now, our sample application is ready.

### How it works…

Now, let's track the application's execution path to better understand how it works.

The main() function begins with creating an instance of the asio::io_service class.
We need it because just like sockets, acceptors, resolvers, and other components defined by
the Boost.Asio library, which use operating system services, timers require an instance of the
```cpp
asio::io_service class as well.
```

In the next step, the first timer named t1 is instantiated and then the expires_from_now()
method is called on it. This method switches the timer to a non-expired state and starts it. It
accepts an argument that represents the duration of the time interval, after which the timer
should expire. In our sample, we pass an argument that represents the duration of 2 seconds,
which means that in 2 seconds, from the moment when the timer starts, it will expire and all
those who are waiting for this timer's expiration event will be notified.

Next, the second timer named t2 is created, which is then started and set up to expire
in 5 seconds.

When both the timers are started, we asynchronously wait for the timers' expiration events. In
other words, we register callbacks on each of the two timers, which will be invoked when the
corresponding timers expire. To do this, we call the timer's async_wait() method and pass
the pointer to the callback function as an argument. The async_wait() method expects its
argument to be a pointer to the function that has the following signature:

```cpp
void callback(
  const boost::system::error_code& ec);
```

The callback function accepts a single ec argument, which designates the wait completion
status. In our sample application, we use lambda functions as expiration callbacks for
both the timers.

When both timer expiration callbacks are set, the run() method is called on the ios object.
The method blocks until both the timers expire. The thread, in the context of which the
method run() is invoked, will be used to invoke the expiration callbacks.

When the first timer expires, the corresponding callback function is invoked. It checks the wait
completion status and outputs corresponding messages to the standard output stream. And
then it cancels the second timer by calling the cancel() method on the t2 object.

The canceling of the second timer leads to the expiration callback being called with the
status code, notifying that the timer was canceled before expiration. The expiration callback
of the second timer checks the expiration status and outputs corresponding messages to the
standard output stream and returns.

When both callbacks are completed, the run() method returns and the execution of
the main() function runs to the end. This is when the execution of the application
is completed.

Getting and setting socket options

The socket's properties and its behavior can be configured by changing the values of its
various options. When the socket object is instantiated, its options have default values.
In many cases, the socket configured by default is a perfect fit, whereas in others, it may
be needed to fine tune the socket by changing values of its options so that it meets the
requirements of the application.

In this recipe, we will see how to get and set socket options with Boost.Asio.

### Getting ready…

This recipe assumes familiarity with the content provided in Chapter 1, The Basics.

### How to do it…

Each socket option, whose value can be set or obtained by means of a functionality provided
by Boost.Asio, is represented by a separate class. The complete list of classes that represent
setting or getting socket options, which are supported by Boost.Asio, can be found on this
Boost.Asio documentation page at http://www.boost.org/doc/libs/1_58_0/doc/
html/boost_asio/reference/socket_base.html.

Note that there are fewer classes that represent socket options listed on this page than the
options that can be set or obtained from a native socket (an object of the underlying operating
system). This is because Boost.Asio supports only a limited amount of socket options. To set
or obtain values of other socket options, developers may need to extend the Boost.Asio library
by adding classes that represent the required options. However, the topic on the extension
of the Boost.Asio library is beyond the scope of this book. We will focus on how to work with
socket options that are supported by the library out of the box.

Let's consider a hypothetical situation where we want to make the size of the socket's receive
buffer two times bigger than whatever its size is now. To do this, we first need to get the
current size of the buffer, then multiply it by two, and finally, set the value obtained after
multiplication as the new receive buffer size.

The following sample demonstrates how to do this in the following code:

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  try {
    asio::io_service ios;

    // Create and open a TCP socket.
    asio::ip::tcp::socket sock(ios, asio::ip::tcp::v4());

    // Create an object representing receive buffer
      // size option.
    asio::socket_base::receive_buffer_size cur_buf_size;

    // Get the currently set value of the option.
    sock.get_option(cur_buf_size);

    std::cout << "Current receive buffer size is "
      << cur_buf_size.value() << " bytes."
      << std::endl;

    // Create an object representing receive buffer
      // size option with new value.
    asio::socket_base::receive_buffer_size
      new_buf_size(cur_buf_size.value() * 2);

    // Set new value of the option.
    sock.set_option(new_buf_size);

    std::cout << "New receive buffer size is "
      << new_buf_size.value() << " bytes."
      << std::endl;
  }
  catch (system::system_error &e) {
    std::cout << "Error occured! Error code = " << e.code()
      << ". Message: " << e.what();

    return e.code().value();
  }

  return 0;
}

```

### How it works…

Our sample consists of a single component: the main() entry point function. This function
begins with creating an instance of the asio::io_service class. This instance is then used
to create an object that represents a TCP socket.

Note the usage of the socket class constructor, which creates and opens the socket. Before
we can get or set options on a particular socket object, the corresponding socket must be
opened. This is because before the Boost.Asio socket object is opened, the underlying native
socket object of the corresponding operating system is not yet allocated, and there is nothing
to set the options on or get them from.

Next, an instance of the asio::socket_base::receive_buffer_size class is
instantiated. This class represents an option that controls the size of the socket's receive
buffer. To obtain the current value of the option, the get_option() method is called on the
socket object and the reference to the option object is passed to it as an argument.

The get_option() method deduces the option that is requested by the type of the
argument passed to it. Then, it stores the corresponding option's value in the option object
and returns. The value of the option can be obtained from the object that represents the
corresponding option by invoking the object's value() method, which returns the value of
the option.

After the current value of receive buffer size option is obtained and output to the standard
output stream, in order to set the new value of this option, the main() function proceeds with
```cpp
creating one more instance of the asio::socket_base::receive_buffer_size class
```

named new_buf_size. This instance represents the same option as the first instance, cur_
buf_size, but this one contains the new value. The new option value is passed to the option
object as an argument of its constructor.

After the option object that contains the new receive buffer size option value is constructed,
the reference to it is passed as an argument to the socket's set_option() method. Like
get_option(), this method deduces the option to be set by the type of the argument
passed to it, and then, sets the corresponding option value, making the new value equal to
the one stored in the option object.

In the last step, the new option's value is output to the standard output stream.

Performing a stream-based I/O

The concepts of a stream and stream-based I/O are powerful in their expressiveness and
elegance when used properly. Sometimes, most of the application's source code consists
of stream-based I/O operations. The source code readability and maintainability of such an
application would be increased if network communication modules were implemented by
means of stream-based operations as well.

Fortunately, Boost.Asio provides tools that allow us to implement inter-process communication
in a stream-based fashion. In this recipe, we will see how to use them.

### How to do it…

The Boost.Asio library contains the asio::ip::tcp::iostream wrapper class that
provides an I/O stream-like interface to the TCP socket objects, which allows us to express
inter-process communication operations in terms of stream-based operations.

Let's consider a TCP client application, which takes advantage of a stream-based I/O provided
by Boost.Asio. When using this approach, the TCP client application becomes as simple as the
following code:

```cpp
#include <boost/asio.hpp>
#include <iostream>

using namespace boost;

int main()
{
  asio::ip::tcp::iostream stream("localhost", "3333");
  if (!stream) {
    std::cout << "Error occurred! Error code = "
      << stream.error().value()
      << ". Message = " << stream.error().message()
      << std::endl;

    return -1;
  }

  stream << "Request.";
  stream.flush();

  std::cout << "Response: " << stream.rdbuf();

  return 0;
}

```

### How it works…

The sample TCP client is quite simple and consists of a single component: the main()
entry point function. The main() function begins with creating an instance of the
asio::ip::tcp::iostream class, which wraps a TCP socket and provides an I/O
stream-like interface to it.

The stream object is constructed with a constructor that accepts a server DNS name and
a protocol port number and automatically tries to resolve the DNS name and then tries to
connect to that server. Note that the port number is represented as a string rather than an
integer. This is because both arguments passed to this constructor are directly used to create
the resolver query, which requires the port number to be represented as a string (it should
be expressed as a service name such as http, ftp, and so on or a port number that is
represented as a string such as "80", "8081", "3333", and so on).

Alternatively, we can construct the stream object using the default constructor, which does
not perform the DNS name resolution and connection. Then, when the object is constructed,
we can call the connect() method on it by specifying the DNS name and protocol port
number in order to perform the resolution and connect the socket.

Next, the state of the stream object is tested to find out whether the connection has
succeeded. And if the stream object is in a bad or erroneous state, the appropriate message
is output to the standard output stream and the application exits. The error() method of the
asio::ip::tcp::iostream class returns an instance of the boost::system::error_
code class, which provides the information about the last error that occurred in the stream.

However, if the stream has been successfully connected to the server, the output operation
is performed on it, which sends the string Request, to the server. After this, the flush()
method is called on the stream object to make sure that all the buffered data is pushed to
the server.

In the last step, the input operation is performed on the stream to read all the data that was
received from the server as a response. The received message is output to the standard
output stream. After this, the main() function returns and the application exits.

### There's more…

Not only can we implement the client-side I/O in a stream-oriented fashion using the
asio::ip::tcp::iostream class, we can also perform I/O operations on the server side
as well. In addition to this, this class allows us to specify timeouts for operations, which makes
a stream-based I/O more advantageous than a normal synchronous I/O. Let's take a look at
how this is done.

Implementing a server-side I/O
The following code snippet demonstrates how to implement a simple server that performs a
```cpp
stream-based I/O using the asio::ip::tcp::iostream class:

  // ...
  asio::io_service io_service;

  asio::ip::tcp::acceptor acceptor(io_service,

    asio::ip::tcp::endpoint(asio::ip::tcp::v4(), 3333));

  asio::ip::tcp::iostream stream;

acceptor.accept(*stream.rdbuf());
std::cout << "Request: " << stream.rdbuf();
stream << "Response.";
// ...
```

This code snippet demonstrates a piece of source code of a simple server application. It
creates instances of acceptors and the asio::ip::tcp::iostream classes. And then,
the interesting thing happens.

The accept() method is invoked on the acceptor object. As an argument, this method
is passed an object, a pointer to which is returned by the rdbuf() method called on the
stream object. The rdbuf() method of the stream object returns a pointer to the stream
buffer object. This stream buffer object is an instance of a class, which is inherited from the
asio::ip::tcp::socket class, which means that the stream buffer used by objects of
the asio::ip::tcp ::iostream class plays two roles: one of a stream buffer and another
of a socket. Therefore, this twofold stream buffer/socket object can be used as a normal
active socket to connect and communicate with the client application.

When the connection request is accepted and the connection is established, further
communication with the client is done in a stream-fashioned style just like it is done in
the client application, as demonstrated earlier in this recipe.

Setting timeout intervals
Because I/O operations are provided by the asio::ip::tcp::stream class block the
thread of execution, and they potentially may run for a substantial amount of time, the class
provides a way to set a timeout period that, when it runs out, leads to the interruption of the
operation that currently blocks the thread, if any.

The timeout interval can be set by the expires_from_now() method of the
asio::ip::tcp::stream class. This method accepts the duration of the timeout interval
as an input parameter and starts the internal timer. If at the moment, when the timer expires,
an I/O operation is still in progress, that operation is considered timed out and is, therefore,
forcefully interrupted.

A

active socket
about  12
creating  13-16

asynchronous client application

about  96
versus synchronous client application  97

asynchronous operations

canceling  80-85

asynchronous server application  129
asynchronous TCP client

application, starting  119
client, closing  124
implementing  110-119
initializing  119
request, canceling  123, 124
request completion  119
request, initiating  120-123

asynchronous TCP server

about  147
Acceptor class  156
implementing  147-154
main() entry point function  157
Server class  157
Service class  155, 156
working  155

AsyncTCPClient class  119

B

Berkley Sockets API  4
binding  25
Boost.Asio  12

Index

client  95
client applications
classifying  96
communication  40
composite buffers

about  212
preparing, for gather output operations  213
preparing, for input operation  214-216
using, for scatter/gather operations  212, 213

connections

accepting  34-38

distributed application

about  2
benefits  2

DNS name
about  19
resolving  19-23

DNS name resolution  20
domain name  19
Domain Name System (DNS)  19

E

endpoint
about  5
creating  5-11
creating, in client for server designation  7
goals  6
socket, binding to  25-27

execute() method  181
extensible buffers
about  47, 48
working  49

F

fixed length I/O buffers

preparing for input operation  44-46
preparing for output operation  43, 45
using  41-43

G

multiprotocol servers  128
multithreaded TCP client application

implementing  124-126

N

network programming

about  5
simplifying  5
notifiers  128
notify clients  128

get_id() getter method  181

O

on_connection_established() method  181
on_host_name_resolved() method  181
overlapping  99

P

parallel server  128
passive socket
about  12, 17
creating  17-19

private members, SyncTCPClient class

```cpp
asio::io_service m_ios  103
asio::ip::tcp::endpoint m_ep  103
asio::ip::tcp::socket m_sock  103

private members, SyncUDPClient class

asio::io_service m_ios  108
asio::ip::udp::socket m_sock  108
```

push-style communication model  128

R

request headers block  188
request life cycle

stages  98

response body  175
response headers block  173

H

handler() function  183
HTTP client application
callback  177, 183
HTTPClient class  176, 179
HTTPRequest class  166-182
HTTPResponse class  165, 166, 183
implementing  161-164
main() entry point function  177-179

HTTP protocol
about  159
HTTP client application  159
HTTP server application  159

HTTP request line  186
HTTP response status line  182
HTTP server application
implementing  184-195

inversion of control approach  40
about  39
additional operations  41
asynchronous operations  40
I/O buffers  40
synchronous operations  40

iterative server  128

S

sample protocol  99
Secure Socket Layer (SSL)  160
server  95, 127
server endpoint
creating  8
simplicity  130
single-threaded TCP client  124
socket

about  4
binding, to endpoint  25-27
connecting  29-34

socket options

getting  221-223
setting  221-223
SSL context  208
SSL/TLS handshake  208
SSL/TLS support

about  202
Acceptor class  208, 209
adding, to client applications  196-200
adding, to server applications  202-207
main() entry point function  202
Service class  208
SyncSSLClient class  200-202

status line  171
stream-based I/O

performing  223-225
server-side I/O, implementing  225, 226
timeout intervals, setting  226

synchronous approach

about  130
advantage  130
sample protocol  130, 131
synchronous client application

about  96
versus asynchronous client application  97

synchronous iterative TCP server

Acceptor class  136
drawbacks, eliminating  138
implementing  131-135
main() entry point function  137
results, analyzing  139

Server class  136, 137
Service class  135
stopping, in reasonable amount of time  138
vulnerability, dealing with  139

synchronous operations  129
synchronous parallel TCP server

Acceptor class  145
implementing  139-144
main() entry point function  147
Server class  146
Service class  144, 145
Start() method  146
Stop() method  146

synchronous server  129
synchronous TCP client

about  100
implementing  100-103
main() entry point function  104
SyncTCPClient class  103, 104

synchronous UDP client

about  105
implementing  105-108
main() entry point function  110
SyncUDPClient class  108-110

SyncTCPClient class
about  103, 104
private members  103

SyncUDPClient class

about  108-110
private members  108

T

TCP client  96
TCP protocol

characteristics  3

TCP socket

```cpp
asio::read_at() function  62
asio::read() function  59
asio::read_until() function  60, 61
client application  88, 89
closing  87-91
reading from, asynchronously  71-79
reading from, synchronously  55-58
```

receive() method  58
send() method  53
server application  90, 91
shutting down  86, 87
writing to, asynchronously  62-70
writing to, synchronously  49-52

timers

about  216
using  216-220

Transport Layer Security (TLS)  160

U

UDP client  96
UDP protocol

characteristics  3

Thank you for buying
Boost.Asio C++ Network Programming
Cookbook

About Packt Publishing
Packt, pronounced 'packed', published its first book, Mastering phpMyAdmin for Effective MySQL
Management, in April 2004, and subsequently continued to specialize in publishing highly focused
books on specific technologies and solutions.

Our books and publications share the experiences of your fellow IT professionals in adapting and
customizing today's systems, applications, and frameworks. Our solution-based books give you the
knowledge and power to customize the software and technologies you're using to get the job done.
Packt books are more specific and less general than the IT books you have seen in the past. Our
unique business model allows us to bring you more focused information, giving you more of what
you need to know, and less of what you don't.

Packt is a modern yet unique publishing company that focuses on producing quality, cutting-edge
books for communities of developers, administrators, and newbies alike. For more information,
please visit our website at www.packtpub.com.

About Packt Open Source
In 2010, Packt launched two new brands, Packt Open Source and Packt Enterprise, in order to
continue its focus on specialization. This book is part of the Packt open source brand, home
to books published on software built around open source licenses, and offering information to
anybody from advanced developers to budding web designers. The Open Source brand also runs
Packt's open source Royalty Scheme, by which Packt gives a royalty to each open source project
about whose software a book is sold.

Writing for Packt
We welcome all inquiries from people who are interested in authoring. Book proposals should
be sent to author@packtpub.com. If your book idea is still at an early stage and you would
like to discuss it first before writing a formal book proposal, then please contact us; one of our
commissioning editors will get in touch with you.

We're not just looking for published authors; if you have strong technical skills but no writing
experience, our experienced editors can help you develop a writing career, or simply get some
additional reward for your expertise.

Learning Boost C++Libraries
ISBN: 978-1-78355-121-7             Paperback: 558 pages

Solve practical programming problems using powerful,
portable, and expressive libraries from Boost

1.  Learn to apply the breadth of Boost libraries,
including containers, smart pointers, regular
expressions, threads, network I/O, and other
utilities through practical programming examples.

2.  Write clear and succinct C++ code that is efficient

and maintainable.

3.  Speed up using the Boost libraries without

any prior knowledge, using an in-depth tutorial
introduction.

Boost C++ Application
Development Cookbook
ISBN: 978-1-84951-488-0            Paperback: 348 pages

Over 80 practical, task-based recipes to create
applications using Boost libraries

1.  Explores how to write a program once and then
use it on Linux, Windows, MacOS, and Android
operating systems.

2.

Includes everyday use recipes for multithreading,
networking, metaprogramming,  and generic
programming from a Boost library developer.

3.  Take advantage of the real power of Boost and

C++ to get a good grounding in using it in any
project.

Please check www.PacktPub.com for information on our titles

Learning Object-Oriented
Programming
ISBN:  978-1-78528-963-7           Paperback: 280 pages

Explore and crack the OOP code in Python, JavaScript,
and C#

1.  Write reusable code that defines and makes

objects interact with one another.

2.  Discover the differences in inheritance and
polymorphism in Python, JavaScript, and C#.

3.  Capture objects from real-world elements and

create object-oriented code that represents them.

Objective-C Memory
Management Essentials
ISBN: 978-1-84969-712-5            Paperback: 200 pages

Learn and put into practice various memory
management techniques in Objective-C to create robust
iOS applications

1.  Learn about the concepts of memory

management in Objective-C.

2.  Get introduced to Swift, an innovative new

programming language for Cocoa and Cocoa
Touch.

3.  A step-by-step approach to various memory

management techniques with lots of sample code
and Xcode projects for your reference.

Please check www.PacktPub.com for information on our titles
