---
id: cpp-concurrency-02-managing-threads
title: "Chapter 2: Managing threads"
titleEn: "Chapter 2: Managing threads"
order: 42
category: specialized
description: "Launching threads, passing arguments, transferring ownership, and determining thread count at runtime."
tags: ["C++", "std::thread", "RAII", "Thread Ownership", "Hardware Concurrency"]
---

# Chapter 2: Managing threads

Managing threads

This chapter covers

- Starting threads, and various ways of specifying

code to run on a new thread

- Waiting for a thread to finish versus leaving it

to run

- Uniquely identifying threads

OK,  so  you’ve  decided  to  use  concurrency  for  your  application.  In  particular,
you’ve  decided  to  use  multiple  threads.  What  now?  How  do  you  launch  these
threads,  check  that  they’ve  finished,  and  keep  tabs  on  them?  The  C++  Standard
Library  makes  most  thread-management  tasks  relatively  easy,  with  almost  everything managed through the std::thread object associated with a given thread, as
you’ll  see.  For  those  tasks  that  aren’t  so  straightforward,  the  library  provides  the
flexibility to build what you need from the basic building blocks.

 In this chapter, I’ll start by covering the basics: launching a thread, waiting for it
to  finish,  or  running  it  in  the  background.  We’ll  then  look  at  passing  additional
parameters to the thread function when it’s launched and how to transfer ownership  of  a  thread  from  one  std::thread  object  to  another.  Finally,  we’ll  look  at
choosing the number of threads to use and identifying particular threads.

Basic thread management

## 2.1 Basic thread management

Every C++ program has at least one thread, which is started by the C++ runtime: the
thread running main(). Your program can then launch additional threads that have
another function as the entry point. These threads then run concurrently with each
other and with the initial thread. In the same way that the program exits when it returns
from main(), when the specified entry point function returns, the thread exits. As you’ll
see, if you have a std::thread object for a thread, you can wait for it to finish; but first
you have to start it, so let’s look at launching threads.

### 2.1.1 Launching a thread

As you saw in chapter 1, threads are started by constructing a std::thread object that
specifies the task to run on that thread. In the simplest case, that task is a plain, ordinary void-returning function that takes no parameters. This function runs on its own
thread until it returns, and then the thread stops. At the other extreme, the task could
be a function object that takes additional parameters and performs a series of independent operations that are specified through some kind of messaging system while
it’s running, and the thread stops only when it’s signaled to do so, again via some kind
of  messaging  system.  It  doesn’t  matter  what  the  thread  is  going  to  do  or  where  it’s
launched  from,  but  starting  a  thread  using  the  C++  Standard  Library  always  boils
```cpp
down to constructing a std::thread object:

void do_some_work();
std::thread my_thread(do_some_work);
```

This is about as simple as it gets. Of course, you have to make sure that the <thread>
header is included so the compiler can see the definition of the std::thread class. As
with much of the C++ Standard Library, std::thread works with any callable type, so
you can pass an instance of a class with a function call operator to the std::thread
constructor instead:

```cpp
class background_task
{
```

public:
```cpp
    void operator()() const
    {
        do_something();
        do_something_else();
    }
```

};
background_task f;
```cpp
std::thread my_thread(f);
```

In  this  case,  the  supplied  function  object  is  copied  into  the  storage  belonging  to  the
newly created thread of execution and invoked from there. It’s therefore essential that
the copy behaves equivalently to the original, or the result may not be what’s expected.

 One thing to consider when passing a function object to the thread constructor is
to avoid what’s dubbed “C++’s most vexing parse.” If you pass a temporary rather than
a  named  variable,  the  syntax  can  be  the  same  as  that  of  a  function  declaration,  in
which  case  the  compiler  interprets  it  as  such,  rather  than  an  object  definition.  For
example,

```cpp
std::thread my_thread(background_task());
```

declares a my_thread function that takes a single parameter (of type pointer-to-afunction-taking-no-parameters-and-returning-a-background_task-object) and
returns a std::thread object, rather than launching a new thread. You can avoid this
by naming your function object as shown previously, by using an extra set of parentheses, or by using the new uniform initialization syntax; for example:

```cpp
std::thread my_thread((background_task()));
std::thread my_thread{background_task()};
```

In the first example, the extra parentheses prevent interpretation as a function declaration, allowing my_thread to be declared as a variable of type std::thread. The second  example  uses  the  new  uniform  initialization  syntax  with  braces  rather  than
parentheses, and thus would also declare a variable.

 One type of callable object that avoids this problem is a lambda expression. This is a
new feature from C++11 which allows you to write a local function, possibly capturing
some  local  variables  and  avoiding  the  need  to  pass  additional  arguments  (see  section  2.2).  For  full  details  on  lambda  expressions,  see  appendix  A,  section  A.5.  The
previous example can be written using a lambda expression as follows:

```cpp
std::thread my_thread([]{
    do_something();
    do_something_else();
});
```

Once you’ve started your thread, you need to explicitly decide whether to wait for it
to  finish  (by  joining  with  it—see  section  2.1.2)  or  leave  it  to  run  on  its  own  (by
detaching it—see section 2.1.3). If you don’t decide before the std::thread object
is  destroyed,  then  your  program  is  terminated  (the  std::thread  destructor  calls
std::terminate()). It’s therefore imperative that you ensure that the thread is correctly joined or detached, even in the presence of exceptions. See section 2.1.3 for a
technique  to  handle  this  scenario.  Note  that  you  only  have  to  make  this  decision
before the std::thread object is destroyed—the thread itself may well have finished
long before you join with it or detach it, and if you detach it, then if the thread is
still  running,  it  will  continue  to  do  so,  and  may  continue  running  long  after  the
std::thread object is destroyed; it will only stop running when it finally returns from
the thread function.

  If  you  don’t  wait  for  your  thread  to  finish,  you  need  to  ensure  that  the  data
accessed by the thread is valid until the thread has finished with it. This isn’t a new

Basic thread management

problem—even  in  single-threaded  code  it’s  undefined  behavior  to  access  an  object
after it’s been destroyed—but the use of threads provides an additional opportunity to
encounter such lifetime issues.

 One situation in which you can encounter such problems is when the thread function  holds  pointers  or  references  to  local  variables  and  the  thread  hasn’t  finished
when the function exits. The following listing shows an example of such a scenario.

Listing 2.1 A function that returns while a thread still has access to local variables

```cpp
struct func
{
    int& i;
    func(int& i_):i(i_){}
    void operator()()
    {
        for(unsigned j=0;j<1000000;++j)
        {
            do_something(i);
        }
    }
```

};
```cpp
void oops()
{
    int some_local_state=0;
    func my_func(some_local_state);
    std::thread my_thread(my_func);
    my_thread.detach();
}

Potential access to
dangling reference
```

Don’t wait for
thread to finish

New thread might
still be running

In  this  case,  the  new  thread  associated  with  my_thread  will  probably  still  be  running
when oops exits, because you’ve explicitly decided not to wait for it by calling detach().
If the thread is still running, you have the scenario shown in table 2.1: the next call to
do_something(i)  will  access  an  already  destroyed  variable.  This  is  like  normal  singlethreaded code—allowing a pointer or reference to a local variable to persist beyond the
function exit is never a good idea—but it’s easier to make the mistake with multithreaded
code, because it isn’t necessarily immediately apparent that this has happened.

Table 2.1 Accessing a local variable with a detached thread after it has been destroyed

Main thread

New thread

Constructs my_func with reference to
some_local_state

Starts new thread my_thread

Started

Calls func::operator()

Detaches my_thread

Running func::operator(); may call do_something with
reference to some_local_state

Table 2.1 Accessing a local variable with a detached thread after it has been destroyed (continued)

Main thread

New thread

Destroys some_local_state

Still running

Exits oops

Still running func::operator(); may call do_something
with reference to some_local_state => undefined behavior

One common way to handle this scenario is to make the thread function self-contained
and copy the data into the thread rather than sharing the data. If you use a callable
object for your thread function, that object is copied into the thread, so the original
object can be destroyed immediately. But you still need to be wary of objects containing pointers or references, such as in listing 2.1. In particular, it’s a bad idea to create
a thread within a function that has access to the local variables in that function, unless
the thread is guaranteed to finish before the function exits.

 Alternatively, you can ensure that the thread has completed execution before the

function exits by joining with the thread.

### 2.1.2 Waiting for a thread to complete

If you need to wait for a thread to complete, you can do this by calling join() on
the associated std::thread instance. In the case of listing 2.1, replacing the call to
my_thread.detach()  before  the  closing  brace  of  the  function  body  with  a  call  to
my_thread.join()  would  therefore  be  sufficient  to  ensure  that  the  thread  was  finished before the function was exited and thus before the local variables were destroyed.
In this case, it would mean there was little point in running the function on a separate
thread, because the first thread wouldn’t be doing anything useful in the meantime, but
in real code the original thread would either have work to do or would have launched
several threads to do useful work before waiting for all of them to complete.

 join() is a simple and brute-force technique—either you wait for a thread to finish or you don’t. If you need more fine-grained control over waiting for a thread, such
as to check whether a thread is finished, or to wait only a certain period of time, then
you have to use alternative mechanisms such as condition variables and futures, which
we’ll look at in chapter 4. The act of calling join() also cleans up any storage associated with the thread, so the std::thread object is no longer associated with the nowfinished thread; it isn’t associated with any thread. This means that you can call join()
only once for a given thread; once you’ve called join(), the std::thread object is no
longer joinable, and joinable() will return false.

### 2.1.3 Waiting in exceptional circumstances

As  mentioned  earlier,  you  need  to  ensure  that  you’ve  called  either  join()  or
detach() before a std::thread object is destroyed. If you’re detaching a thread, you
can usually call detach() immediately after the thread has been started, so this isn’t a
problem. But if you’re intending to wait for the thread, you need to carefully pick the

Basic thread management

place in the code where you call join(). This means that the call to join() is liable to
be skipped if an exception is thrown after the thread has been started but before the
call to join().

  To  avoid  your  application  being  terminated  when  an  exception  is  thrown,  you
therefore  need  to  make  a  decision  about  what  to  do  in  this  case.  In  general,  if  you
were intending to call join() in a non-exceptional case, you also need to call join()
in the presence of an exception to avoid accidental lifetime problems. The next listing
shows some simple code that does just that.

Listing 2.2 Waiting for a thread to finish

See definition
in listing 2.1 struct func;
```cpp
void f()
{
    int some_local_state=0;
    func my_func(some_local_state);
    std::thread t(my_func);
```

    try
```cpp
    {
        do_something_in_current_thread();
    }
    catch(...)
    {
        t.join();
        throw;
    }
    t.join();
}
```

The code in listing 2.2 uses a try/catch block to ensure that a thread with access to
local state is finished before the function exits, whether the function exits normally, or
by an exception. The use of try/catch blocks is verbose, and it’s easy to get the scope
slightly wrong, so this isn’t an ideal scenario. If it’s important to ensure that the thread
completes before the function exits—whether because it has a reference to other local
variables or for any other reason—then it’s important to ensure this is the case for all
possible exit paths, whether normal or exceptional, and it’s desirable to provide a simple, concise mechanism for doing so.

 One way of doing this is to use the standard Resource Acquisition Is Initialization
(RAII) idiom and provide a class that does the join() in its destructor, as in the following listing. See how it simplifies the f() function.

Listing 2.3 Using RAII to wait for a thread to complete

```cpp
class thread_guard
{
    std::thread& t;
```

public:
```cpp
    explicit thread_guard(std::thread& t_):
        t(t_)

    {}
    ~thread_guard()
    {
        if(t.joinable())
        {
            t.join();
        }
    }
    thread_guard(thread_guard const&)=delete;
    thread_guard& operator=(thread_guard const&)=delete;
```

};
```cpp
struct func;
void f()
{
    int some_local_state=0;
    func my_func(some_local_state);
    std::thread t(my_func);
    thread_guard g(t);
    do_something_in_current_thread();
}

See definition
```

in listing 2.1 When the execution of the current thread reaches the end of f, the local objects are
destroyed in reverse order of construction. Consequently, the thread_guard object,
g, is destroyed first, and the thread is joined with, in the destructor. This even happens  if  the  function  exits  because  do_something_in_current_thread  throws  an
exception.

 The destructor of thread_guard in listing 2.3 first tests to see if the std::thread
object is joinable() before calling join(). This is important, because join() can be
called only once for a given thread of execution, so it would be a mistake to do so if
the thread had already been joined.

 The copy constructor and copy-assignment operators are marked =delete to ensure
that they’re not automatically provided by the compiler. Copying or assigning such an
object would be dangerous, because it might then outlive the scope of the thread it was
joining. By declaring them as deleted, any attempt to copy a thread_guard object will
generate  a  compilation  error.  See  appendix  A,  section  A.2,  for  more  about  deleted
functions.

 If you don’t need to wait for a thread to finish, you can avoid this exception-safety
issue by detaching it. This breaks the association of the thread with the  std::thread
object  and  ensures  that  std::terminate()  won’t  be  called  when  the  std::thread
object is destroyed, even though the thread is still running in the background.

### 2.1.4 Running threads in the background

Calling  detach()  on  a  std::thread  object  leaves  the  thread  to  run  in  the  background, with no direct means of communicating with it. It’s no longer possible to wait
for that thread to complete; if a thread becomes detached, it isn’t possible to obtain
a  std::thread  object  that  references  it,  so  it  can  no  longer  be  joined.  Detached
threads truly run in the background; ownership and control are passed over to the

Basic thread management

C++ Runtime Library, which ensures that the resources associated with the thread are
correctly reclaimed when the thread exits.

 Detached threads are often called daemon threads after the UNIX concept of a daemon  process  that  runs  in  the  background  without  any  explicit  user  interface.  Such
threads are typically long-running; they run for almost the entire lifetime of the application,  performing  a  background  task  such  as  monitoring  the  filesystem,  clearing
unused  entries  out  of  object  caches,  or  optimizing  data  structures.  At  the  other
extreme, it may make sense to use a detached thread where there’s another mechanism for identifying when the thread has completed or where the thread is used for a
fire-and-forget task.

 As you’ve saw in section 2.1.2, you detach a thread by calling the detach() member  function  of  the  std::thread  object.  After  the  call  completes,  the  std::thread
object is no longer associated with the actual thread of execution and is therefore no
longer joinable:

```cpp
std::thread t(do_background_work);
t.detach();
assert(!t.joinable());
```

In order to detach the thread from a std::thread object, there must be a thread to
detach: you can’t call detach() on a std::thread object with no associated thread of
execution. This is exactly the same requirement as for join(), and you can check it in
exactly the same way—you can only call t.detach() for a std::thread object t when
t.joinable() returns true.

  Consider  an  application  such  as  a  word  processor  that  can  edit  multiple  documents at once. There are many ways to handle this, both at the UI level and internally.
One way that’s increasingly common at the moment is to have multiple, independent,
top-level  windows,  one  for  each  document  being  edited.  Although  these  windows
appear  to  be  completely  independent,  each  with  its  own  menus,  they’re  running
within the same instance of the application. One way to handle this internally is to run
each document-editing window in its own thread; each thread runs the same code but
with different data relating to the document being edited and the corresponding window properties. Opening a new document therefore requires starting a new thread.
The  thread  handling  the  request  isn’t  going  to  care  about  waiting  for  that  other
thread  to  finish,  because  it’s  working  on an  unrelated  document,  so  this  makes  it  a
prime candidate for running a detached thread.

 The following listing shows a simple code outline for this approach.

Listing 2.4 Detaching a thread to handle other documents

```cpp
void edit_document(std::string const& filename)
{
    open_document_and_display_gui(filename);
    while(!done_editing())
    {
        user_command cmd=get_user_input();

        if(cmd.type==open_new_document)
        {
            std::string const new_name=get_filename_from_user();
            std::thread t(edit_document,new_name);
            t.detach();
        }
```

        else
```cpp
        {
            process_user_input(cmd);
        }
    }
}
```

If the user chooses to open a new document, you prompt them for the document to
open, start a new thread to open that document, and then detach it. Because the new
thread is doing the same operation as the current thread but on a different file, you
can reuse the same function (edit_document) with the newly chosen filename as the
supplied argument.

 This example also shows a case where it’s helpful to pass arguments to the function
used  to  start  a  thread:  rather  than  just  passing  the  name  of  the  function  to  the
std::thread  constructor,  you  also  pass  in  the  filename  parameter.  Although  other
mechanisms could be used to do this, such as using a function object with member
data instead of an ordinary function with parameters, the C++ Standard Library provides you with an easy way of doing it.

## 2.2 Passing arguments to a thread function

As shown in listing 2.4, passing arguments to the callable object or function is fundamentally as simple as passing additional arguments to the std::thread constructor.
But it’s important to bear in mind that by default, the arguments are copied into internal storage, where they can be accessed by the newly created thread of execution, and
then passed to the callable object or function as rvalues as if they were temporaries.
This is done even if the corresponding parameter in the function is expecting a reference. Here’s an example:

```cpp
void f(int i,std::string const& s);
std::thread t(f,3,”hello”);
```

This creates a new thread of execution associated with t, which calls f(3,”hello”).
Note that even though f takes a std::string as the second parameter, the string literal is passed as a char const* and converted to a std::string only in the context of
the  new  thread.  This  is  particularly  important  when  the  argument  supplied  is  a
pointer to an automatic variable, as follows:

```cpp
void f(int i,std::string const& s);
void oops(int some_param)
{
    char buffer[1024];
    sprintf(buffer, "%i",some_param);

Passing arguments to a thread function

    std::thread t(f,3,buffer);
    t.detach();
}
```

In this case, it’s the pointer to the local variable buffer that’s passed through to the
new thread and there’s a significant chance that the oops function will exit before
the buffer has been converted to a std::string on the new thread, thus leading to
undefined behavior. The solution is to cast to std::string before passing the buffer
```cpp
to the std::thread constructor:

void f(int i,std::string const& s);
void not_oops(int some_param)
{
    char buffer[1024];
    sprintf(buffer,"%i",some_param);
    std::thread t(f,3,std::string(buffer));
    t.detach();
}

Using std::string
avoids dangling
```

pointer

In  this  case,  the  problem  is  that  you  were  relying  on  the  implicit  conversion  of  the
pointer to the buffer into the std::string object expected as a function parameter,
but this conversion happens too late because the std::thread constructor copies the
supplied values as is, without converting to the expected argument type.

 It’s not possible to get the reverse scenario: the object is copied, and you wanted a
non-const reference, because this won't compile. You might try this if the thread is
updating a data structure that’s passed in by reference; for example:

```cpp
void update_data_for_widget(widget_id w,widget_data& data);
void oops_again(widget_id w)
{
```

    widget_data data;
```cpp
    std::thread t(update_data_for_widget,w,data);
    display_status();
    t.join();
    process_widget_data(data);
}
```

Although update_data_for_widget expects the second parameter to be passed by reference, the std::thread constructor doesn’t know that; it’s oblivious to the types of
the arguments expected by the function and blindly copies the supplied values. But
the internal code passes copied arguments as rvalues in order to work with move-only
types, and will thus try to call update_data_for_widget with an rvalue. This will fail to
compile because you can't pass an rvalue to a function that expects a non-const reference. For those of you familiar with std::bind, the solution will be readily apparent:
you need to wrap the arguments that need to be references in std::ref. In this case,
if you change the thread invocation to

```cpp
std::thread t(update_data_for_widget,w,std::ref(data));
```

then  update_data_for_widget  will  be  correctly  passed  a  reference  to  data  rather
than a temporary copy of data, and the code will now compile successfully.

 If you’re familiar with std::bind, the parameter-passing semantics will be unsurprising,  because  both  the  operation  of  the  std::thread  constructor  and  the  operation of std::bind are defined in terms of the same mechanism. This means that, for
example, you can pass a member function pointer as the function, provided you supply a suitable object pointer as the first argument:

```cpp
class X
{
```

public:
```cpp
    void do_lengthy_work();
```

};
X my_x;
```cpp
std::thread t(&X::do_lengthy_work,&my_x);
```

This code will invoke my_x.do_lengthy_work() on the new thread, because the address
of  my_x  is  supplied  as  the  object  pointer.  You  can  also  supply  arguments  to  such  a
member function call: the third argument to the std::thread constructor will be the
first argument to the member function, and so forth.

  Another  interesting  scenario  for  supplying  arguments  is  where  the  arguments
can’t be copied but can only be moved: the data held within one object is transferred
over  to  another,  leaving  the  original  object  empty.  An  example  of  such  a  type  is
```cpp
std::unique_ptr,  which  provides  automatic  memory  management  for  dynamically
```

allocated objects. Only one std::unique_ptr instance can point to a given object at a
time, and when that instance is destroyed, the pointed-to object is deleted. The move
constructor  and  move  assignment  operator  allow  the  ownership  of  an  object  to  be  transferred around between std::unique_ptr instances (see appendix A, section A.1.1, for
more  on  move  semantics).  Such  a  transfer  leaves  the  source  object  with  a  NULL
pointer. This moving of values allows objects of this type to be accepted as function
parameters  or  returned  from  functions.  Where  the  source  object  is  temporary,  the
move  is  automatic,  but  where  the  source  is  a  named  value,  the  transfer  must  be
requested directly by invoking std::move(). The following example shows the use of
std::move to transfer ownership of a dynamic object into a thread:

```cpp
void process_big_object(std::unique_ptr<big_object>);
std::unique_ptr<big_object> p(new big_object);
p->prepare_data(42);
std::thread t(process_big_object,std::move(p));
```

By specifying  std::move(p)  in  the  std::thread  constructor,  the  ownership  of  big_
object is transferred first into internal storage for the newly created thread and then
into process_big_object.

  Several  of  the  classes  in  the  C++  Standard  Library  exhibit  the  same  ownership
semantics as std::unique_ptr, and std::thread is one of them. Though std::thread
instances don’t own a dynamic object in the same way as std::unique_ptr does, they do

## 2.3 Transferring ownership of a thread

own a resource: each instance is responsible for managing a thread of execution. This
ownership can be transferred between instances, because instances of std::thread are
movable, even though they aren’t copyable. This ensures that only one object is associated  with  a  particular  thread  of  execution  at  any  one  time  while  allowing  programmers the option of transferring that ownership between objects.

Transferring ownership of a thread
Suppose you want to write a function that creates a thread to run in the background,
but passes ownership of the new thread back to the calling function rather than waiting for it to complete; or maybe you want to do the reverse: create a thread and pass
ownership in to some function that should wait for it to complete. In either case, you
need to transfer ownership from one place to another.

 This is where the move support of std::thread comes in. As described in the previous  section,  many  resource-owning  types  in  the  C++  Standard  Library,  such  as
std::ifstream and std::unique_ptr, are movable but not copyable, and std::thread
is one of them. This means that the ownership of a particular thread of execution can
be moved between std::thread instances, as in the following example. The example
shows the creation of two threads of execution and the transfer of ownership of those
```cpp
threads among three std::thread instances, t1, t2, and t3:

void some_function();
void some_other_function();
std::thread t1(some_function);
std::thread t2=std::move(t1);
t1=std::thread(some_other_function);
std::thread t3;
t3=std::move(t2);
t1=std::move(t3);

This assignment
will terminate the
```

program!

First,  a  new  thread  is  started  and  associated  with  t1.  Ownership  is  then  transferred
over to t2 when t2 is constructed, by invoking std::move() to explicitly move ownership. At this point, t1 no longer has an associated thread of execution; the thread running some_function is now associated with t2.

 Then, a new thread is started and associated with a temporary std::thread object.
The subsequent transfer of ownership into t1 doesn’t require a call to std::move() to
explicitly  move  ownership,  because  the  owner  is  a  temporary  object—moving  from
temporaries is automatic and implicit.

 t3 is default-constructed, which means that it’s created without any associated thread
of execution. Ownership of the thread currently associated with t2 is transferred into
t3, again with an explicit call to std::move(), because t2 is a named object. After all
these moves, t1 is associated with the thread running some_other_function, t2 has no
associated thread, and t3 is associated with the thread running some_function.

 The final move transfers ownership of the thread running some_function back to
t1 where it started. But in this case t1 already had an associated thread (which was running some_other_function), so std::terminate() is called to terminate the program.

This is done for consistency with the std::thread destructor. You saw in section 2.1.1 that you must explicitly wait for a thread to complete or detach it before destruction,
and the same applies to assignment: you can’t just drop a thread by assigning a new
value to the std::thread object that manages it.

  The  move  support  in  std::thread  means  that  ownership  can  readily  be  transferred out of a function, as shown in the following listing.

```cpp
Listing 2.5 Returning a std::thread from a function

std::thread f()
{
    void some_function();
    return std::thread(some_function);
}
std::thread g()
{
    void some_other_function(int);
    std::thread t(some_other_function,42);
    return t;
}
```

Likewise, if ownership should be transferred into a function, it can accept an instance
of std::thread by value as one of the parameters, as shown here:

```cpp
void f(std::thread t);
void g()
{
    void some_function();
    f(std::thread(some_function));
    std::thread t(some_function);
    f(std::move(t));
}
```

One  benefit  of  the  move  support  of  std::thread  is  that  you  can  build  on  the
thread_guard  class  from  listing  2.3  and  have  it  take  ownership  of  the  thread.  This
avoids any unpleasant consequences should the thread_guard object outlive the thread
it was referencing, and it also means that no one else can join or detach the thread
once ownership has been transferred into the object. Because this would primarily be
aimed at ensuring that threads are completed before a scope is exited, I named this
class scoped_thread. The implementation is shown in the following listing, along with
a simple example.

Listing 2.6 scoped_thread and example usage

```cpp
class scoped_thread
{
    std::thread t;
```

public:
```cpp
    explicit scoped_thread(std::thread t_):
        t(std::move(t_))

Transferring ownership of a thread

    {
        if(!t.joinable())
            throw std::logic_error(“No thread”);
    }
    ~scoped_thread()
    {
        t.join();
    }
    scoped_thread(scoped_thread const&)=delete;
    scoped_thread& operator=(scoped_thread const&)=delete;
```

};
```cpp
struct func;
void f()
{
    int some_local_state;
    scoped_thread t{std::thread(func(some_local_state))};
    do_something_in_current_thread();
}
```

See listing 2.1 The  example  is  similar  to  listing  2.3,  but  the  new  thread  is  passed  in  directly  to
scoped_thread rather than having to create a separate named variable for it. When
the initial thread reaches the end of f, the scoped_thread object is destroyed and then
joins with the thread supplied to the constructor. Whereas with the thread_guard class
from listing 2.3 the destructor had to check that the thread was still joinable, you can
do that in the constructor and throw an exception if it’s not.

 One of the proposals for C++17 was for a joining_thread class that would be similar to std::thread, except that it would automatically join in the destructor much like
scoped_thread does. This didn't get consensus in the committee, so it wasn’t accepted
into the standard (though it’s still on track for C++20 as std::jthread), but it’s relatively easy to write. One possible implementation is shown in the next listing.

Listing 2.7 A joining_thread class

```cpp
class joining_thread
{
    std::thread t;
```

public:
```cpp
    joining_thread() noexcept=default;
    template<typename Callable,typename ... Args>
    explicit joining_thread(Callable&& func,Args&& ... args):
        t(std::forward<Callable>(func),std::forward<Args>(args)...)
    {}
    explicit joining_thread(std::thread t_) noexcept:
        t(std::move(t_))
    {}
```

    joining_thread(joining_thread&& other) noexcept:
```cpp
        t(std::move(other.t))
    {}
```

    joining_thread& operator=(joining_thread&& other) noexcept
```cpp
    {
        if(joinable())
            join();

        t=std::move(other.t);
        return *this;
    }
    joining_thread& operator=(std::thread other) noexcept
    {
        if(joinable())
            join();
        t=std::move(other);
        return *this;
    }
```

    ~joining_thread() noexcept
```cpp
    {
        if(joinable())
            join();
    }
    void swap(joining_thread& other) noexcept
    {
        t.swap(other.t);
    }
    std::thread::id get_id() const noexcept{
        return t.get_id();
    }
    bool joinable() const noexcept
    {
        return t.joinable();
    }
    void join()
    {
        t.join();
    }
    void detach()
    {
        t.detach();
    }
    std::thread& as_thread() noexcept
    {
        return t;
    }
    const std::thread& as_thread() const noexcept
    {
        return t;
    }
```

};

The move support in std::thread also allows for containers of std::thread objects,
if  those  containers  are  move-aware  (like  the  updated  std::vector<>).  This  means
that you can write code like that in the following listing, which spawns a number of
threads and then waits for them to finish.

Listing 2.8 Spawns some threads and waits for them to finish

```cpp
void do_work(unsigned id);
void f()
```

Choosing the number of threads at runtime

```cpp
{
    std::vector<std::thread> threads;
    for(unsigned i=0;i<20;++i)
    {
        threads.emplace_back(do_work,i);
    }
    for(auto& entry: threads)
        entry.join();
}

Calls join() on each
thread in turn

Spawns threads
```

If the threads are being used to subdivide the work of an algorithm, this is often what’s
required;  before  returning  to  the  caller,  all  threads  must  have  finished.  The  simple
structure of listing 2.8 implies that the work done by the threads is self-contained, and
the result of their operations is purely the side effects on shared data. If f() were to
return a value to the caller that depended on the results of the operations performed
by these threads, then as written, this return value would have to be determined by
examining the shared data after the threads had terminated. Alternative schemes for
transferring the results of operations between threads are discussed in chapter 4.

  Putting  std::thread  objects  in  a  std::vector  is  a  step  toward  automating  the
management  of  those  threads:  rather  than  creating  separate  variables  for  those
threads and joining with them directly, they can be treated as a group. You can take
this a step further by creating a dynamic number of threads determined at runtime,
rather than creating a fixed number, as in listing 2.8.

## 2.4 Choosing the number of threads at runtime

One feature of the C++ Standard Library that helps here is std::thread::hardware_
concurrency(). This function returns an indication of the number of threads that can
truly run concurrently for a given execution of a program. On a multicore system it
might be the number of CPU cores, for example. This is only a hint, and the function
might return 0 if this information isn’t available, but it can be a useful guide for splitting a task among threads.

```cpp
 Listing 2.9 shows a simple implementation of a parallel version of std::accumulate.
```

In real code you'll probably want to use the parallel version of std::reduce described
in chapter 10, rather than implementing it yourself, but this illustrates the basic idea.
It  divides  the  work  among  the  threads,  with  a  minimum  number  of  elements  per
thread in order to avoid the overhead of too many threads. Note that this implementation assumes that none of the operations will throw an exception, even though exceptions are possible; the std::thread constructor will throw if it can’t start a new thread
of execution, for example. Handling exceptions in such an algorithm is beyond the
scope of this simple example and will be covered in chapter 8.

```cpp
Listing 2.9 A naïve parallel version of std::accumulate

template<typename Iterator,typename T>
struct accumulate_block

{
    void operator()(Iterator first,Iterator last,T& result)
    {
        result=std::accumulate(first,last,result);
    }
```

};
```cpp
template<typename Iterator,typename T>
T parallel_accumulate(Iterator first,Iterator last,T init)
{
    unsigned long const length=std::distance(first,last);
    if(!length)
        return init;
    unsigned long const min_per_thread=25;
    unsigned long const max_threads=
        (length+min_per_thread-1)/min_per_thread;
    unsigned long const hardware_threads=
        std::thread::hardware_concurrency();
    unsigned long const num_threads=
        std::min(hardware_threads!=0?hardware_threads:2,max_threads);
    unsigned long const block_size=length/num_threads;
    std::vector<T> results(num_threads);
    std::vector<std::thread>  threads(num_threads-1);
    Iterator block_start=first;
    for(unsigned long i=0;i<(num_threads-1);++i)
    {
        Iterator block_end=block_start;
        std::advance(block_end,block_size);
        threads[i]=std::thread(
            accumulate_block<Iterator,T>(),
            block_start,block_end,std::ref(results[i]));
        block_start=block_end;
    }
    accumulate_block<Iterator,T>()(
        block_start,last,results[num_threads-1]);

    for(auto& entry: threads)
           entry.join();
    return std::accumulate(results.begin(),results.end(),init);
}
```

Although this is a long function, it’s straightforward. If the input range is empty, you
return  the  initial  value  supplied  as  the  init  parameter  value.  Otherwise,  there’s  at
least one element in the range, so you can divide the number of elements to process
by the minimum block size in order to give the maximum number of threads . This is
to avoid creating 32 threads on a 32-core machine when you have only five values in
the range.

 The number of threads to run is the minimum of your calculated maximum and
the number of hardware threads. You don’t want to run more threads than the hardware can support (which is called oversubscription), because the context switching will
mean that more threads will decrease the performance. If the call to std::thread::
hardware_concurrency()  returned  0,  you’d  substitute  a  number  of  your  choice;  in

Choosing the number of threads at runtime

this case I’ve chosen 2. You don’t want to run too many threads because that would
slow things down on a single-core machine, but likewise you don’t want to run too few
because you’d be passing up the available concurrency.

  The  number  of  entries  for  each  thread  to  process  is  the  length  of  the  range
divided by the number of threads. If you’re worrying about cases where the number
doesn’t divide evenly, don’t—you’ll handle that later.

 Now that you know how many threads you have, you can create a std::vector<T>
for the intermediate results and a std::vector<std::thread> for the threads. Note
that  you  need  to  launch  one  fewer  thread  than  num_threads,  because  you  already
have one.

 Launching the threads is a simple loop: advance the block_end iterator to the end
of the current block and launch a new thread to accumulate the results for this block.
The start of the next block is the end of this one.

 After you’ve launched all the threads, this thread can then process the final block.
This is where you take account of any uneven division: you know the end of the final
block must be last, and it doesn’t matter how many elements are in that block.

  Once  you’ve  accumulated  the  results  for  the  last  block,  you  can  wait  for  all  the
threads you spawned with std::for_each, as in listing 2.8, and then add up the results
```cpp
with a final call to std::accumulate.
```

  Before  you  leave  this  example,  it’s  worth  pointing  out  that  where  the  addition
operator for the type T isn’t associative (such as for float or double), the results of
this  parallel_accumulate  may  vary  from  those  of  std::accumulate  because  of  the
grouping of the range into blocks. Also, the requirements on the iterators are slightly
more stringent: they must be at least forward iterators, whereas std::accumulate can
work with single-pass input iterators, and T must be default-constructible so that you can
create the results vector. These sorts of requirement changes are common with parallel algorithms; by their nature they’re different in order to make them parallel, and
this has consequences for the results and requirements. Implementing parallel algorithms is covered in more depth in chapter 8, and chapter 10 covers the standard supplied ones from C++17 (the equivalent to the parallel_accumulate described here
being the parallel form of std::reduce). It’s also worth noting that because you can’t
return  a  value  directly  from  a  thread,  you  must  pass  in  a  reference  to  the  relevant
entry  in  the  results  vector.  Alternative  ways  of  returning  results  from  threads  are
addressed through the use of futures in chapter 4.

 In this case, all the information required by each thread was passed in when the
thread was started, including the location in which to store the result of its calculation.
This isn’t always the case; sometimes it’s necessary to be able to identify the threads in
some way for part of the processing. You could pass in an identifying number, such as
the value of i in listing 2.8, but if the function that needs the identifier is several levels
deep in the call stack and could be called from any thread, it’s inconvenient to have to
do  it  that  way.  When  we  were  designing  the  C++  Standard  Library  we  foresaw  this
need, so each thread has a unique identifier.

## 2.5 Identifying threads

Thread  identifiers  are  of  type  std::thread::id  and  can  be  retrieved  in  two  ways.
First, the identifier for a thread can be obtained from its associated std::thread object
by calling the get_id() member function. If the std::thread object doesn’t have an
associated  thread  of  execution,  the  call  to  get_id()  returns  a  default-constructed
std::thread::id object, which indicates “not any thread.” Alternatively, the identifier
for  the  current  thread  can  be  obtained  by  calling  std::this_thread::  get_id(),
which is also defined in the <thread> header.

 Objects of type std::thread::id can be freely copied and compared; they wouldn’t
be of much use as identifiers otherwise. If two objects of type  std::thread::id are
equal, they represent the same thread, or both are holding the “not any thread” value.
If  two  objects  aren’t  equal,  they  represent  different  threads,  or  one  represents  a
thread and the other is holding the “not any thread” value.

 The C++ Standard Library doesn’t limit you to checking whether thread identifiers
are the same or not; objects of type std::thread::id offer the complete set of comparison  operators,  which  provide  a  total  ordering  for  all  distinct  values.  This  allows
them to be used as keys in associative containers, or sorted, or compared in any other
way that you as a programmer may see fit. The comparison operators provide a total
order for all non-equal values of std::thread::id, so they behave as you’d intuitively
expect:  if  a<b  and  b<c,  then  a<c,  and  so  forth.  The  Standard  Library  also  provides
std::hash<std::thread::id> so that values of type std::thread::id can be used as
keys in the new unordered associative containers too.

 Instances of std::thread::id are often used to check whether a thread needs to
perform some operation. For example, if threads are used to divide work, as in listing
2.9, the initial thread that launched the others might need to perform its work slightly
differently  in  the  middle  of  the  algorithm.  In  this  case  it  could  store  the  result  of
std::this_thread::get_id() before launching the other threads, and then the core
part of the algorithm (which is common to all threads) could check its own thread ID
against the stored value:

```cpp
std::thread::id master_thread;
void some_core_part_of_algorithm()
{
    if(std::this_thread::get_id()==master_thread)
    {
        do_master_thread_work();
    }
    do_common_work();
}
```

Alternatively,  the  std::thread::id  of  the  current  thread  could  be  stored  in  a  data
structure as part of an operation. Later operations on that same data structure could
then  check  the  stored  ID  against  the  ID of  the  thread  performing  the  operation  to
determine what operations are permitted/required.

### Summary

 Similarly, thread IDs could be used as keys into associative containers where specific  data  needs  to  be  associated  with  a  thread  and  alternative  mechanisms  such  as
thread-local storage aren’t appropriate. Such a container could, for example, be used
by a controlling thread to store information about each of the threads under its control or for passing information between threads.

 The idea is that std::thread::id will suffice as a generic identifier for a thread in
most  circumstances;  it’s  only  if  the  identifier has semantic meaning associated with it
(such as being an index into an array) that alternatives should be necessary. You can
even write out an instance of std::thread::id to an output stream such as std::cout:

```cpp
std::cout<<std::this_thread::get_id();
```

The  exact  output  you  get  is  strictly  implementation-dependent;  the  only  guarantee
given  by  the  standard  is  that  thread  IDs  that  compare  as  equal  should  produce  the
same output, and those that aren’t equal should give different output. This is therefore  primarily  useful  for  debugging  and  logging,  but  the  values  have  no  semantic
meaning, so there’s not much more that could be said anyway.

### Summary

In  this  chapter,  I  covered  the  basics  of  thread  management  with  the  C++  Standard
Library: starting threads, waiting for them to finish, and not waiting for them to finish
because you want them to run in the background. We also saw how to pass arguments
into the thread function when a thread is started, how to transfer the responsibility for
managing a thread from one part of the code to another, and how groups of threads
can be used to divide work. Finally, we discussed identifying threads in order to associate  data  or  behavior  with  specific  threads  that’s  inconvenient  to  associate  through
alternative means. Although you can do quite a lot with purely independent threads
that  each  operate  on  separate  data,  sometimes  it’s  desirable  to  share  data  among
threads  while  they’re  running.  Chapter  3  discusses  the  issues  surrounding  sharing
data directly among threads, and chapter 4 covers more general issues surrounding
synchronizing operations with and without shared data.

Sharing data
between threads

This chapter covers

- Problems with sharing data between threads
- Protecting data with mutexes
- Alternative facilities for protecting shared data

One of the key benefits of using threads for concurrency is the potential to easily
and directly share data between them, so now that we’ve covered starting and managing threads, let’s look at the issues surrounding shared data.

 Imagine for a moment that you’re sharing an apartment with a friend. There’s
only  one  kitchen  and  one  bathroom.  Unless  you’re  particularly  friendly,  you  can’t
both use the bathroom at the same time, and if your roommate occupies the bathroom for a long time, it can be frustrating if you need to use it. Likewise, though it
might be possible to both cook meals at the same time, if you have a combined oven
and grill, it’s not going to end well if one of you tries to grill some sausages at the
same time as the other is baking a cake. Furthermore, we all know the frustration of
sharing a space and getting halfway through a task only to find that someone has borrowed something we need or changed something from the way we left it.

 It’s the same with threads. If you’re sharing data between threads, you need to
have rules for which thread can access which bit of data when, and how any updates

## 3.1 Problems with sharing data between threads

are communicated to the other threads that care about that data. The ease with which
data can be shared between multiple threads in a single process is not only a benefit—
it can also be a big drawback. Incorrect use of shared data is one of the biggest causes
of concurrency-related bugs, and the consequences can be far worse than sausageflavored cakes.

  This  chapter  is  about  sharing  data  safely  between  threads  in  C++,  avoiding  the

potential problems that can arise, and maximizing the benefits.

Problems with sharing data between threads
When it comes down to it, the problems with sharing data between threads are all due
to the consequences of modifying data. If all shared data is read-only, there’s no problem,
because the data read by one thread is unaffected by whether or not another thread is reading the
same data. But if data is shared between threads, and one or more threads start modifying the data, there’s a lot of potential for trouble. In this case, you must take care to
ensure that everything works out OK.

 One concept that’s widely used to help programmers reason about their code is
invariants—statements that are always true about a particular data structure, such as
“this variable contains the number of items in the list.” These invariants are often broken  during  an  update,  especially  if  the  data  structure  is  of  any  complexity  or  the
update requires modification of more than one value.

 Consider a doubly linked list, where each node holds a pointer to both the next
node  in  the  list  and  the  previous  one.  One  of  the  invariants  is  that  if  you  follow  a
“next” pointer from one node (A) to another (B), the “previous” pointer from that
node (B) points back to the first node (A). In order to remove a node from the list,
the  nodes  on  either  side  have  to  be  updated  to  point  to  each  other.  Once  one  has
been  updated,  the  invariant  is  broken  until  the  node  on  the  other  side  has  been
updated too; after the update has completed, the invariant holds again.

 The steps in deleting an entry from such a list are shown in figure 3.1:

a

Identify the node to delete: N.

b Update the link from the node prior to N to point to the node after N.
c Update the link from the node after N to point to the node prior to N.
d Delete node N.

As you can see in figure 3.1, between steps b and c, the links going in one direction
are  inconsistent  with  the  links  going  in  the  opposite  direction,  and  the  invariant  is
broken.

 The simplest potential problem with modifying data that’s shared between threads
is that of broken invariants. If you don’t do anything special to ensure otherwise, if
one  thread  is  reading  the  doubly  linked  list  while  another  is  removing  a  node,  it’s
quite possible for the reading thread to see the list with a node only partially removed
(because only one of the links has been changed, as in step b of figure 3.1), so the
invariant is broken. The consequences of this broken invariant can vary; if the other

thread is reading the list items from left to right in the diagram, it will skip the node
being deleted. On the other hand, if the second thread is trying to delete the rightmost node in the diagram, it might end up permanently corrupting the data structure
and  eventually  crashing  the  program.  Whatever  the  outcome,  this  is  an  example  of
one of the most common causes of bugs in concurrent code: a race condition.

Figure 3.1 Deleting a node from a doubly linked list

### 3.1.1 Race conditions

Suppose you’re buying tickets to see a movie at the movie theater. If it’s a big theater,
multiple cashiers will be taking money so more than one person can buy tickets at the
same  time.  If  someone  at  another  cashier’s  desk  is  also  buying  tickets  for  the  same

Problems with sharing data between threads

movie  as  you  are,  which  seats  are  available  for  you  to  choose  from  depends  on
whether the other person books first or you do. If there are only a few seats left, this
difference can be quite crucial: it might literally be a race to see who gets the last tickets. This is an example of a race condition: which seats you get (or even whether you get
tickets) depends on the relative ordering of the two purchases.

 In concurrency, a race condition is anything where the outcome depends on the
relative ordering of execution of operations on two or more threads; the threads race
to perform their respective operations. Most of the time, this is quite benign because
all possible outcomes are acceptable, even though they may change with different relative orderings. For example, if two threads are adding items to a queue for processing,  it  generally  doesn’t  matter  which  item  gets  added  first,  provided  that  the
invariants of the system are maintained. It’s when the race condition leads to broken
invariants  that  there’s  a  problem,  such  as  with  the  doubly  linked  list  example  mentioned. When talking about concurrency, the term race condition is usually used to mean
a problematic race condition; benign race conditions aren’t so interesting and aren’t a
cause of bugs. The C++ Standard also defines the term data race to mean the specific
type of race condition that arises because of concurrent modification to a single object
(see section 5.1.2 for details); data races cause the dreaded undefined behavior.

 Problematic race conditions typically occur where completing an operation requires
modification of two or more distinct pieces of data, such as the two link pointers in
the  example.  Because  the  operation  must  access  two  separate  pieces  of  data,  these
must  be  modified  in  separate  instructions,  and  another  thread  could  potentially
access the data structure when only one of them has been completed. Race conditions
can often be hard to find and hard to duplicate because the window of opportunity is
small.  If  the  modifications  are  done  as  consecutive  CPU  instructions,  the  chance  of
the problem exhibiting on any one run-through is small, even if the data structure is
being accessed by another thread concurrently. As the load on the system increases,
and  the  number  of  times  the  operation  is  performed  increases,  the  chance  of  the
problematic  execution  sequence  occurring  also  increases.  It’s  almost  inevitable  that
such problems will show up at the most inconvenient time. Because race conditions
are generally timing-sensitive, they can often disappear entirely when the application
is run under the debugger, because the debugger affects the timing of the program,
even if only slightly.

 If you’re writing multithreaded programs, race conditions can easily be the bane
of your existence; a great deal of the complexity in writing software that uses concurrency comes from avoiding problematic race conditions.

### 3.1.2 Avoiding problematic race conditions

There are several ways to deal with problematic race conditions. The simplest option
is  to  wrap  your  data  structure  with  a  protection  mechanism  to  ensure  that  only  the
thread performing a modification can see the intermediate states where the invariants
are broken. From the point of view of other threads accessing that data structure, such
