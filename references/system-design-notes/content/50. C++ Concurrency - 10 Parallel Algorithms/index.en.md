---
id: cpp-concurrency-10-parallel-algorithms
title: "Chapter 10: Parallel algorithms"
titleEn: "Chapter 10: Parallel algorithms"
order: 50
category: specialized
description: "Execution policies in C++17, parallelizing standard algorithms, and performance considerations."
tags: ["C++", "C++17", "Parallel STL", "Execution Policies", "std::execution"]
---

# Chapter 10: Parallel algorithms

Parallel algorithms

This chapter covers

- Using the C++17 parallel algorithms

In the last chapter we looked at advanced thread management and thread pools,
and in chapter 8 we looked at designing concurrent code, using parallel versions of
some algorithms as examples. In this chapter, we’ll look at the parallel algorithms
provided by the C++17 standard, so let’s start, without further ado.

## 10.1 Parallelizing the standard library algorithms

The C++17 standard added the concept of parallel algorithms to the C++ Standard
Library. These are additional overloads of many of the functions that operate on
ranges,  such  as  std::find,  std::transform  and  std::reduce.  The  parallel  versions have the same signature as the “normal” single-threaded versions, except for
the addition of a new first parameter, which specifies the execution policy to use. For
example:

```cpp
std::vector<int> my_data;
std::sort(std::execution::par,my_data.begin(),my_data.end());
```

The execution policy of std::execution::par indicates to the standard library that
it is allowed to perform this call as a parallel algorithm, using multiple threads. Note

that this is permission, not a requirement—the library may still execute the code on a single thread if it wishes. It is also important to note that by specifying an execution policy,  the  requirements  on  the  algorithm  complexity  have  changed,  and  are  usually
slacker than the requirements for the normal serial algorithm. This is because parallel
algorithms often do more total work in order to take advantage of the parallelism of
the system — if you can divide the work across 100 processors, then you can still get an
overall speed up to 50, even if the implementation does twice as much total work.

 Before we get onto the algorithms themselves, let’s take a look at the execution

policies.

## 10.2 Execution policies

The standard specifies three execution policies:

```cpp
- std::execution::sequenced_policy
- std::execution::parallel_policy
- std::execution::parallel_unsequenced_policy
```

These are classes defined in the <execution> header. The header also defines three
corresponding policy objects to pass to the algorithms:

```cpp
- std::execution::seq
- std::execution::par
- std::execution::par_unseq
```

You  cannot  rely  on  being  able  to  construct  objects  from  these  policy  classes  yourself,
except  by  copying  these  three  objects,  because  they  might  have  special  initialization
requirements. Implementations may also define additional execution policies that have
implementation-specific behavior. You cannot define your own execution policies.

 The consequences of these policies on the behavior of the algorithms are described
in section 10.2.1. Any given implementation is also allowed to provide additional execution policies, with whatever semantics they want. Let’s now take a look at the consequences  of  using  one  of  the  standard  execution  policies,  starting  with  the  general
changes for all algorithm overloads that take an exception policy.

### 10.2.1 General effects of specifying an execution policy

If  you  pass  an  execution  policy  to  one  of  the  standard  library  algorithms,  then  the
behavior of that algorithm is now governed by the execution policy. This affects several aspects of the behavior:

- The algorithm’s complexity
- The behavior when an exception is thrown
- Where, how, and when the steps of the algorithm are executed

EFFECTS ON ALGORITHM COMPLEXITY
If an execution policy is supplied to an algorithm, then that algorithm’s complexity
may be changed: in addition to the scheduling overhead of managing the parallel

Execution policies

execution, many parallel algorithms will perform more of the core operations of the
algorithm (whether swaps, comparisons, or applications of a supplied function object), with
the intention that this provides an overall improvement in the performance in terms
of total elapsed time.

 The precise details of the complexity change will vary with each algorithm, but the
general  policy  is  that  if  an  algorithm  specifies  something  will  happen  exactly  someexpression times, or at most some-expression times, then the overload with an execution
policy will slacken that requirement to O(some-expression). This means that the overload
with  an  execution  policy  may  perform  some  multiple  of  the  number  of  operations
performed  by  its  counterpart  without  an  execution  policy,  where  that  multiple  will
depend on the internals of the library and the platform, rather than the data supplied
to the algorithm.

EXCEPTIONAL BEHAVIOR
If an exception is thrown during execution of an algorithm with an execution policy,
then  the  consequences  are  determined  by  the  execution  policy.  All  the  standardsupplied execution policies will call std::terminate if there are any uncaught exceptions. The only exception that may be thrown by a call to a standard library algorithm
with one of the standard execution policies is std::bad_alloc, which is thrown if the
library  cannot  obtain  sufficient  memory  resources  for  its  internal  operations.  For
example, the following call to std::for_each, without an execution policy, will propagate the exception

```cpp
std::for_each(v.begin(),v.end(),[](auto x){ throw my_exception(); });
```

whereas the corresponding call with an execution policy will terminate the program:

```cpp
std::for_each(
    std::execution::seq,v.begin(),v.end(),
    [](auto x){ throw my_exception(); });
```

This is one of the key differences between using std::execution::seq and not providing an execution policy.

WHERE AND WHEN ALGORITHM STEPS ARE EXECUTED
This is the fundamental aspect of an execution policy, and is the only aspect that differs  between  the  standard  execution  policies.  The  policy  specifies  which  execution
agents are used to perform the steps of the algorithm, be they “normal” threads, vector  streams,  GPU  threads,  or  anything  else.  The  execution  policy  will  also  specify
whether  there  are  any  ordering  constraints  on  how  the  algorithm  steps  are  run:
whether or not they are run in any particular order, whether or not parts of separate
algorithm steps may be interleaved with each other, or run in parallel with each other,
and so forth.

 The details for each of the standard execution policies are given in sections 10.2.2,
10.2.3,  and  10.2.4,  starting  with  the  most  basic  policy:  std::execution::sequenced
_policy.

### 10.2.2 std::execution::sequenced_policy

The sequenced policy is not a policy for parallelism: using it forces the implementation to perform all operations on the thread that called the function, so there is no
parallelism.  But  it  is  still  an  execution  policy,  and  therefore  has  the  same  consequences  on  algorithmic  complexity  and  the  effect  of  exceptions  as  the  other  standard policies.

 Not only must all operations be performed on the same thread, but they must be
performed in some definite order, so they are not interleaved. The precise order is
unspecified,  and  may  be  different  between  different  invocations  of  the  function.  In
particular, the order of execution of the operations is not guaranteed to be the same
as that of the corresponding overload without an execution policy. For example, the
following call to std::for_each will populate the vector with the numbers 1-1,000, in
an unspecified order. This is in contrast to the overload without an execution policy,
which will store the numbers in order:

```cpp
std::vector<int> v(1000);
int count=0;
std::for_each(std::execution::seq,v.begin(),v.end(),
    [&](int& x){ x=++count; });
```

The numbers may be stored in order, but you cannot rely on it.

 This means that the sequenced policy imposes few requirements on the iterators,
values, and callable objects used with the algorithm: they may freely use synchronization mechanisms, and may rely on all operations being invoked on the same thread,
though they cannot rely on the order of these operations.

### 10.2.3 std::execution::parallel_policy

The  parallel  policy  provides  basic  parallel  execution  across  a  number  of  threads.
Operations may be performed either on the thread that invoked the algorithm, or on
threads created by the library. Operations performed on a given thread must be performed in a definite order, and not interleaved, but the precise order is unspecified,
and may vary between invocations. A given operation will run on a fixed thread for its
entire duration.

 This imposes additional requirements on the iterators, values, and callable objects
used with the algorithm over the sequenced policy: they must not cause data races if
invoked in parallel, and must not rely on being run on the same thread as any other
operation, or indeed rely on not being run on the same thread as any other operation.
 You can use the parallel execution policy for the vast majority of cases where you
would  have  used  a  standard  library  algorithm  without  an  execution  policy.  It’s  only
where there is specific ordering between elements that is required, or unsynchronized
access to shared data, that is problematic. Incrementing all the values in a vector can
be done in parallel:

```cpp
std::for_each(std::execution::par,v.begin(),v.end(),[](auto& x){++x;});
```

The parallel algorithms from the C++ Standard Library

The previous example of populating a vector is not OK if done with the parallel execution policy; specifically, it is undefined behavior:

```cpp
std::for_each(std::execution::par,v.begin(),v.end(),
    [&](int& x){ x=++count; });
```

Here,  the  variable  count  is  modified  from  every  invocation  of  the  lambda,  so  if  the
library were to execute the lambdas across multiple threads, this would be a data race,
and  thus  undefined  behavior.  The  requirements  for  std::execution::parallel_
policy pre-empt this: it is undefined behavior to make the preceding call, even if the
library doesn’t use multiple threads for this call. Whether or not something exhibits
undefined behavior is a static property of the call, rather than dependent on implementation details of the library. Synchronization between the function invocations is
permitted, however, so you could make this defined behavior again either by making
count an std::atomic<int> rather than a plain int, or by using a mutex. In this case,
that would likely defeat the point of using the parallel execution policy, because that
would  serialize  all  the  calls,  but  in  the  general  case  it  would  allow  for  synchronized
access to a shared state.

### 10.2.4 std::execution::parallel_unsequenced_policy

The parallel unsequenced policy provides the library with the greatest scope for parallelizing the algorithm in exchange for imposing the strictest requirements on the iterators, values, and callable objects used with the algorithm.

  An  algorithm  invoked  with  the  parallel  unsequenced  policy  may  perform  the
algorithm  steps  on  unspecified  threads  of  execution,  unordered  and  unsequenced
with respect to one another. This means that operations may now be interleaved with
each other on a single thread, such that a second operation is started on the same
thread before the first has finished, and may be migrated between threads, so a given
operation may start on one thread, run further on a second thread, and complete on
a third.

  If  you  use  the  parallel  unsequenced  policy,  then  the  operations  invoked  on  the
iterators, values, and callable objects supplied to the algorithm must not use any form
of synchronization or call any function that synchronizes with another, or any function such that some other code synchronizes with it.

 This means that the operations must only operate on the relevant element, or any
data that can be accessed based on that element, and must not modify any state shared
between threads, or between elements.

 We’ll flesh these out with some examples later. For now, let’s take a look at the parallel algorithms themselves.

## 10.3 The parallel algorithms from the C++ Standard Library

Most of the algorithms from the <algorithm> and <numeric> headers have overloads
that  take  an  execution  policy.  This  comprises:  all_of,  any_of,  none_of,  for_each,

for_each_n, find, find_if, find_end, find_first_of, adjacent_find, count, count_if,
mismatch,  equal,  search,  search_n,  copy,  copy_n,  copy_if,  move,  swap_ranges,
transform,  replace,  replace_if,  replace_copy,  replace_copy_if,  fill,  fill_n,
generate,  generate_n,  remove,  remove_if,  remove_copy,  remove_copy_if,  unique,
unique_copy,  reverse,  reverse_copy,  rotate,  rotate_copy,  is_partitioned,
partition,  stable_partition,  partition_copy,  sort,  stable_sort,  partial_sort,
partial_sort_copy,  is_sorted,  is_sorted_until,  nth_element,  merge,  inplace
_merge,  includes,  set_union,  set_intersection,  set_difference,  set_symmetric
_difference, is_heap, is_heap_until, min_element, max_element, minmax_element,
lexicographical_compare,  reduce,  transform_reduce,  exclusive_scan,  inclusive
_scan,  transform_exclusive_scan,  transform_inclusive_scan,  and  adjacent_
difference.

 That’s quite a list; pretty much every algorithm in the C++ Standard Library that
could be parallelized is in this list. Notable exceptions are things like std::accumulate,
which is strictly a serial accumulation, but its generalized counterpart in std::reduce
does appear in the list — with a suitable warning in the standard that if the reduction
operation is not both associative and commutative, then the result may be nondeterministic due to the unspecified order of operations.

 For each of the algorithms in the list, every “normal” overload has a new variant
which takes an execution policy as the first argument—the corresponding arguments
for  the  “normal”  overload  then  come  after  this  execution  policy.  For  example,
```cpp
std::sort has two “normal” overloads without an execution policy:

template<class RandomAccessIterator>
void sort(RandomAccessIterator first, RandomAccessIterator last);

template<class RandomAccessIterator, class Compare>
void sort(
    RandomAccessIterator first, RandomAccessIterator last, Compare comp);
```

It therefore also has two overloads with an execution policy:

```cpp
template<class ExecutionPolicy, class RandomAccessIterator>
void sort(
    ExecutionPolicy&& exec,
    RandomAccessIterator first, RandomAccessIterator last);

template<class ExecutionPolicy, class RandomAccessIterator, class Compare>
void sort(
    ExecutionPolicy&& exec,
    RandomAccessIterator first, RandomAccessIterator last, Compare comp);
```

There is one important difference between the signatures with and without the execution policy argument, which only impacts some algorithms: if the “normal” algorithm
allows  Input  Iterators  or  Output  Iterators,  then  the  overloads  with  an  execution  policy
require  Forward  Iterators  instead.  This  is  because  Input  Iterators  are  fundamentally
single-pass: you can only access the current element, and you cannot store iterators to

The parallel algorithms from the C++ Standard Library

previous  elements.  Similarly,  Output  Iterators  only  allow  writing  to  the  current  element: you cannot advance them to write a later element, and then backtrack to write a
previous one.

Iterator categories in the C++ Standard Library
The C++ Standard Library defines five categories of iterators: Input Iterators, Output
Iterators, Forward Iterators, Bidirectional Iterators, and Random Access Iterators.

Input Iterators are single-pass iterators for retrieving values. They are typically used
for things like input from a console or network, or generated sequences. Advancing
an Input Iterator invalidates any copies of that iterator.

Output Iterators are single-pass iterators for writing values. They are typically used for
output to files, or adding values to a container. Advancing an Output Iterator invalidates any copies of that iterator.

Forward  Iterators  are  multipass  iterators  for  one-way  iteration  through  persistent
data. Though you can't make an iterator go back to a previous element, you can store
copies and use them to reference earlier elements. Forward Iterators return real references to the elements, and so can be used for both reading and writing (if the target is non-const).

Bidirectional Iterators are multipass iterators like Forward Iterators, but they can also
be made to go backward to access previous elements.

Random Access Iterators are multipass iterators that can go forward and backward
like Bidirectional Iterators, but they can go forward and backward in steps larger than
a single element, and you can directly access elements at an offset, using the array
index operator.

```cpp
Thus, given the “normal” signature for std::copy

template<class InputIterator, class OutputIterator>
OutputIterator copy(
    InputIterator first, InputIterator last, OutputIterator result);
```

the overload with an execution policy is

```cpp
template<class ExecutionPolicy,
    class ForwardIterator1, class ForwardIterator2>
ForwardIterator2 copy(
    ExecutionPolicy&& policy,
    ForwardIterator1 first, ForwardIterator1 last,
    ForwardIterator2 result);
```

Though the naming of the template parameters doesn’t carry any direct consequence
from  the  compiler’s  perspective,  it  does  from  the  C++  Standard’s  perspective:  the
names of the template parameters for Standard Library algorithms denote semantic
constraints  on  the  types,  and  the  algorithms  will  rely  on  the  operations  implied  by

those constraints existing, with the specified semantics. In the case of Input Iterators
vs. Forward Iterators, the former allows dereferencing the iterator to return a proxy
type, which is convertible to the value type of the iterator, whereas the latter requires
that dereferencing the iterator returns a real reference to the value and that all equal
iterators return a reference to the same value.

 This is important for parallelism: it means that the iterators can be freely copied
around,  and  used  equivalently.  Also,  the  requirement  that  incrementing  a  Forward
Iterator  does  not  invalidate  other  copies  is  important,  as  it  means  that  separate
threads  can  operate  on  their  own  copies  of  the  iterators,  incrementing  them  when
required, without concern about invalidating the iterators held by the other threads.
If  the  overload  with  an  execution  policy  allowed  use  of  Input  Iterators,  this  would
force any threads to serialize access to the one and only iterator that was used for reading from the source sequence, which obviously limits the potential for parallelism.

 Let’s have a look at some concrete examples.

### 10.3.1 Examples of using parallel algorithms

The  simplest  possible  example  surely  has  to  be  the  parallel  loop:  do  something  for
each element of a container. This is the classic example of an embarrassingly parallel
scenario: each item is independent, so you have the maximum possibility of parallelism. With a compiler that supports OpenMP, you might write

#pragma omp parallel for
```cpp
for(unsigned i=0;i<v.size();++i){
    do_stuff(v[i]);
}
```

With the C++ Standard Library algorithms, you can instead write

```cpp
std::for_each(std::execution::par,v.begin(),v.end(),do_stuff);
```

This will divide the elements of the range between the internal threads created by the
library, and invoke do_stuff(x) on each element x in the range. How those elements
are divided between the threads is an implementation detail.

CHOICE OF EXECUTION POLICY
std::execution::par  is  the  policy  that  you’ll  want  to  use  most  often,  unless  your
implementation  provides  a  nonstandard  policy  better  suited  to  your  needs.  If  your
code is suitable for parallelization, then it should work with std::execution::par. In
some  circumstances,  you  may  be  able  to  use  std::execution::par_unseq  instead.
This may do nothing at all (none of the standard execution policies make a guarantee
about the level of parallelism that will be attained), but it may give the library additional scope to improve the performance of the code by reordering and interleaving
the  tasks,  in  exchange  for  the  tighter  requirements  on  your  code.  Most  notable  of
these  tighter  requirements  is  that  there  is  no  synchronization  used  in  accessing  the
elements, or performing the operations on the elements. This means that you cannot

The parallel algorithms from the C++ Standard Library

use mutexes or atomic variables, or any of the other mechanisms described in previous chapters, to ensure that accesses from multiple threads are safe; instead, you must
rely  on  the  algorithm  itself  not  accessing  the  same  element  from  multiple  threads,
and use external synchronization outside the call to the parallel algorithm to prevent
other threads accessing the data.

  The  example  from  listing  10.1  shows  some  code  that  can  be  used  with  std::
execution::par, but not std::execution::par_unseq. The use of the internal mutex
for synchronization means that attempting to use std::execution::par_unseq would
be undefined behavior.

Listing 10.1 Parallel algorithms on a class with internal synchronization

```cpp
class X{
    mutable std::mutex m;
    int data;
```

public:
```cpp
    X():data(0){}
    int get_value() const{
        std::lock_guard guard(m);
        return data;
    }
    void increment(){
        std::lock_guard guard(m);
```

        ++data;
```cpp
    }
```

};
```cpp
void increment_all(std::vector<X>& v){
    std::for_each(std::execution::par,v.begin(),v.end(),
        [](X& x){
            x.increment();
        });
}
```

The next listing shows an alternative that can be used with std::execution::par_un-
seq. In this case, the internal per-element mutex has been replaced with a whole-container mutex.

Listing 10.2 Parallel algorithms on a class without internal synchronization

```cpp
class Y{
    int data;
```

public:
```cpp
    Y():data(0){}
    int get_value() const{
        return data;
    }
    void increment(){
```

        ++data;
```cpp
    }
```

};

```cpp
class ProtectedY{
    std::mutex m;
    std::vector<Y> v;
```

public:
```cpp
   void lock(){
         m.lock();
     }
   void unlock(){
         m.unlock();
     }
     std::vector<Y>& get_vec(){
         return v;
     }
```

};
```cpp
void increment_all(ProtectedY& data){
    std::lock_guard guard(data);
    auto& v=data.get_vec();
    std::for_each(std::execution::par_unseq,v.begin(),v.end(),
        [](Y& y){
            y.increment();
        });
}
```

The element accesses in listing 10.2 now have no synchronization, and it is safe to use
std::execution::par_unseq.  The  downside  is  that  concurrent  accesses  from  other
threads outside the parallel algorithm invocation must now wait for the entire operation to complete, rather than the per-element granularity of listing 10.1.

 Let’s now take a look at a more realistic example of how the parallel algorithms

might be used: counting visits to a website.

### 10.3.2 Counting visits

Suppose you run a busy website, such that the logs contain millions of entries, and you
want to process those logs to see aggregate data: how many visits per page, where do
those visits come from, which browsers were used to access the website, and so forth.
Analyzing these logs has two parts: processing each line to extract the relevant information, and aggregating the results together. This is an ideal scenario for using parallel  algorithms,  because  processing  each  individual  line  is  entirely  independent  of
everything else, and aggregating the results can be done piecemeal, provided the final
totals are correct.

 In particular, this is the sort of task that transform_reduce is designed for. The

following listing shows how this could be used for this task.

Listing 10.3 Using transform_reduce to count visits to pages of a website

```cpp
#include <vector>
#include <string>
#include <unordered_map>
#include <numeric>
```

The parallel algorithms from the C++ Standard Library

```cpp
struct log_info {
    std::string page;
```

    time_t visit_time;
```cpp
    std::string browser;
    // any other fields
```

};

```cpp
extern log_info parse_log_line(std::string const &line);
```

b

```cpp
using visit_map_type= std::unordered_map<std::string, unsigned long long>;
```

visit_map_type
```cpp
count_visits_per_page(std::vector<std::string> const &log_lines) {

    struct combine_visits {
```

        visit_map_type
```cpp
        operator()(visit_map_type lhs, visit_map_type rhs) const {
            if(lhs.size() < rhs.size())
                std::swap(lhs, rhs);
            for(auto const &entry : rhs) {
                lhs[entry.first]+= entry.second;
            }
            return lhs;
        }
```

e
```cpp
        visit_map_type operator()(log_info log,visit_map_type map) const{
```

            ++map[log.page];
```cpp
            return map;
        }
- visit_map_type operator()(visit_map_type map,log_info log) const{
```

            ++map[log.page];
```cpp
            return map;
        }
```

g
```cpp
        visit_map_type operator()(log_info log1,log_info log2) const{
```

            visit_map_type map;
            ++map[log1.page];
            ++map[log2.page];
```cpp
            return map;
        }
```

    };

```cpp
    return std::transform_reduce(
        std::execution::par, log_lines.begin(), log_lines.end(),
        visit_map_type(), combine_visits(), parse_log_line);
}
```

Assuming you’ve got some function parse_log_line to extract the relevant information from a log entry B, your count_visits_per_page function is a simple wrapper
around a call to std::transform_reduce c. The complexity comes from the reduction
operation: you need to be able to combine two log_info structures to produce a map,
a log_info structure and a map (either way around), and two maps. This therefore
means that your combine_visits function object needs four overloads of the function

call operator, d, e, f, and g, which precludes doing it with a simple lambda, even
though the implementation of these four overloads is simple.

  The  implementation  of  std::transform_reduce  will  therefore  use  the  available
hardware to perform this calculation in parallel (because you passed std::execution
::par). Writing this algorithm manually is nontrivial, as we saw in the previous chapter, so this allows you to delegate the hard work of implementing the parallelism to
the Standard Library implementers, so you can focus on the required outcome.

### Summary

In  this  chapter  we  looked  at  the  parallel  algorithms  available  in  the  C++  Standard
Library and how to use them. We looked at the various execution policies, the impact
your choice of execution policy has on the behavior of the algorithm, and the restrictions it imposes on your code. We then looked at an example of how this algorithm
might be used in real code.
