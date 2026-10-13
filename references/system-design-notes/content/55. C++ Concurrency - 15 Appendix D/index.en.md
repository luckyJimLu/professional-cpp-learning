---
id: cpp-concurrency-15-appendix-d
title: "Appendix D: C++ Thread Library reference"
titleEn: "Appendix D: C++ Thread Library reference"
order: 55
category: specialized
description: "Comprehensive API reference for the standard thread library headers: <thread>, <mutex>, <condition_variable>, <future>, <atomic>."
tags: ["C++", "API Reference", "std::thread", "std::mutex", "std::atomic"]
---

# Appendix D: C++ Thread Library reference

C++ Thread
Library reference

D.1

The <chrono> header
The <chrono> header provides classes for representing points in time, durations,
and clock classes, which act as a source of time_points. Each clock has an is_steady
static  data  member,  which  indicates  whether  it’s  a  steady  clock  that  advances  at  a
uniform rate (and can’t be adjusted). The std::chrono::steady_clock class is the
only clock guaranteed to be steady.

Header contents
```cpp
namespace std
{
   namespace chrono
   {
       template<typename Rep,typename Period = ratio<1>>
       class duration;
       template<
           typename Clock,
           typename Duration = typename Clock::duration>
       class time_point;
       class system_clock;
       class steady_clock;
       typedef unspecified-clock-type high_resolution_clock;
   }
}

D.1.1 std::chrono::duration class template

The  std::chrono::duration  class  template  provides  a  facility  for  representing
```

durations. The template parameters Rep and Period are the data type to store the
duration value and an instantiation of the std::ratio class template indicating the

length of time (as a fraction of a second) between successive “ticks,” respectively. Thus
std::chrono::duration<int, std::milli> is a count of milliseconds stored in a value
of type int, whereas std::chrono::duration<short, std::ratio<1,50>> is a count of
fiftieths  of  a  second  stored  in  a  value  of  type  short, and  std::chrono::  d-uration
<long long, std::ratio<60,1>> is a count of minutes stored in a value of type long
long.

Class definition
```cpp
template <class Rep, class Period=ratio<1> >
class duration
{
```

public:
```cpp
    typedef Rep rep;
    typedef Period period;

    constexpr duration() = default;
    ~duration() = default;

    duration(const duration&) = default;
    duration& operator=(const duration&) = default;

    template <class Rep2>
    constexpr explicit duration(const Rep2& r);

    template <class Rep2, class Period2>
    constexpr duration(const duration<Rep2, Period2>& d);

    constexpr rep count() const;
    constexpr duration operator+() const;
    constexpr duration operator-() const;
    duration& operator++();
    duration operator++(int);
    duration& operator--();
    duration operator--(int);
    duration& operator+=(const duration& d);
    duration& operator-=(const duration& d);
    duration& operator*=(const rep& rhs);
    duration& operator/=(const rep& rhs);
    duration& operator%=(const rep& rhs);
    duration& operator%=(const duration& rhs);
    static constexpr duration zero();
    static constexpr duration min();
    static constexpr duration max();
```

};

```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator==(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator!=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

The <chrono> header

```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);

template <class ToDuration, class Rep, class Period>
constexpr ToDuration duration_cast(const duration<Rep, Period>& d);
```

Requirements
Rep  must  be  a  built-in  numeric  type,  or  a  number-like  user-defined  type.  Period
must be an instantiation of std::ratio<>.

STD::CHRONO::DURATION::REP TYPEDEF
This is a typedef for the type used to hold the number of ticks in a duration value.

Declaration
```cpp
typedef Rep rep;
```

rep is the type of value used to hold the internal representation of the duration
object.

STD::CHRONO::DURATION::PERIOD TYPEDEF
This typedef is for an instantiation of the std::ratio class template that specifies the
fraction  of  a  second  represented  by  the  duration  count.  For  example,  if  period  is
std::ratio<1,50>, a duration value with a count() of N represents N fiftieths of
a second.

Declaration
```cpp
typedef Period period;
```

STD::CHRONO::DURATION DEFAULT CONSTRUCTOR
```cpp
Constructs an std::chrono::duration instance with a default value.
```

Declaration
```cpp
constexpr duration() = default;
```

Effects
The internal value of the duration (of type rep) is default initialized.

STD::CHRONO::DURATION CONVERTING CONSTRUCTOR FROM A COUNT VALUE
```cpp
Constructs an std::chrono::duration instance with a specified count.
```

Declaration
```cpp
template <class Rep2>
constexpr explicit duration(const Rep2& r);
```

Effects
The internal value of the duration object is initialized with static_cast<rep>(r).

Requirements
This constructor only participates in overload resolution if Rep2 is implicitly convertible to Rep and either Rep is a floating point type or Rep2 is not a floating point type.

Postcondition
this->count()==static_cast<rep>(r)

STD::CHRONO::DURATION CONVERTING CONSTRUCTOR FROM ANOTHER STD::CHRONO::DURATION VALUE
Constructs an std::chrono::duration instance by scaling the count value of another
```cpp
std::chrono::duration object.
```

Declaration
```cpp
template <class Rep2, class Period2>
constexpr duration(const duration<Rep2,Period2>& d);
```

Effects
The internal value of the duration object is initialized with duration_cast<duration
<Rep,Period>>(d).count().

Requirements
This constructor only participates in overload resolution if Rep is a floating point
type or Rep2 is not a floating point type and Period2 is a whole number multiple of
Period (that is, ratio_divide<Period2,Period>::den==1). This avoids accidental
truncation  (and  corresponding  loss  of  precision)  from  storing  a  duration  with
small periods in a variable representing a duration with a longer period.

Postcondition
this->count()==duration_cast<duration<Rep,Period>>(d).count()

Examples
```cpp
duration<int,ratio<1,1000>> ms(5);
duration<int,ratio<1,1>> s(ms);
duration<double,ratio<1,1>> s2(ms);
duration<int,ratio<1,1000000>> us(ms);

Five milliseconds
```

OK: s2.count()==0.005 OK: us.count()==5000

Error: can’t store ms
as integral seconds

STD::CHRONO::DURATION::COUNT MEMBER FUNCTION
Retrieves the value of the duration.

Declaration
```cpp
constexpr rep count() const;
```

Returns
The internal value of the duration object, as a value of type rep.

The <chrono> header

STD::CHRONO::DURATION::OPERATOR+ UNARY PLUS OPERATOR
This is a no-op: it just returns a copy of *this.

Declaration
```cpp
constexpr duration operator+() const;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR- UNARY MINUS OPERATOR
Returns  a  duration  such  that  the  count()  value  is  the  negative  value  of  this->
count().

Declaration
```cpp
constexpr duration operator-() const;
```

Returns
```cpp
duration(-this->count());
```

STD::CHRONO::DURATION::OPERATOR++ PRE-INCREMENT OPERATOR
Increments the internal count.

Declaration
```cpp
duration& operator++();
```

Effects
```cpp
++this->internal_count;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR++ POST-INCREMENT OPERATOR
Increments the internal count and returns the value of *this prior to the increment.

Declaration
```cpp
duration operator++(int);
```

Effects
```cpp
duration temp(*this);
++(*this);
return temp;
```

STD::CHRONO::DURATION::OPERATOR-- PRE-DECREMENT OPERATOR
Decrements the internal count.

Declaration
```cpp
duration& operator--();
```

Effects
```cpp
--this->internal_count;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR-- POST-DECREMENT OPERATOR
Decrements the internal count and returns the value of *this prior to the decrement.

Declaration
```cpp
duration operator--(int);
```

Effects
```cpp
duration temp(*this);
--(*this);
return temp;
```

STD::CHRONO::DURATION::OPERATOR+= COMPOUND ASSIGNMENT OPERATOR
Adds the count for another duration object to the internal count for *this.

Declaration
```cpp
duration& operator+=(duration const& other);
```

Effects
```cpp
internal_count+=other.count();
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR-= COMPOUND ASSIGNMENT OPERATOR
Subtracts the count for another duration object from the internal count for *this.

Declaration
```cpp
duration& operator-=(duration const& other);
```

Effects
```cpp
internal_count-=other.count();
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR*= COMPOUND ASSIGNMENT OPERATOR
Multiplies the internal count for *this by the specified value.

Declaration
```cpp
duration& operator*=(rep const& rhs);
```

Effects
```cpp
internal_count*=rhs;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR/= COMPOUND ASSIGNMENT OPERATOR
Divides the internal count for *this by the specified value.

Declaration
```cpp
duration& operator/=(rep const& rhs);
```

The <chrono> header

Effects
```cpp
internal_count/=rhs;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR%= COMPOUND ASSIGNMENT OPERATOR
Adjusts the internal count for *this to be the remainder when divided by the specified value.

Declaration
```cpp
duration& operator%=(rep const& rhs);
```

Effects
```cpp
internal_count%=rhs;
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::OPERATOR%= COMPOUND ASSIGNMENT OPERATOR
Adjusts the internal count for *this to be the remainder when divided by the count of
the other duration object.

Declaration
```cpp
duration& operator%=(duration const& rhs);
```

Effects
```cpp
internal_count%=rhs.count();
```

Returns
```cpp
*this
```

STD::CHRONO::DURATION::ZERO STATIC MEMBER FUNCTION
Returns a duration object representing a value of zero.

Declaration
```cpp
constexpr duration zero();
```

Returns
```cpp
duration(duration_values<rep>::zero());
```

STD::CHRONO::DURATION::MIN STATIC MEMBER FUNCTION
Returns  a  duration  object  holding  the  minimum  possible  value  for  the  specified
instantiation.

Declaration
```cpp
constexpr duration min();
```

Returns
```cpp
duration(duration_values<rep>::min());
```

STD::CHRONO::DURATION::MAX STATIC MEMBER FUNCTION
Returns  a  duration  object  holding  the  maximum  possible  value  for  the  specified
instantiation.

Declaration
```cpp
constexpr duration max();
```

Returns
```cpp
duration(duration_values<rep>::max());
```

STD::CHRONO::DURATION EQUALITY COMPARISON OPERATOR
Compares two duration objects for equality, even if they have distinct representations
and/or periods.

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator==(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly convert to the other, the expression is ill-formed.

Effects
If CommonDuration is a synonym for std::common_type< duration< Rep1, Period1>,
duration< Rep2, Period2>>::type, then lhs==rhs returns CommonDuration(lhs)
.count()==CommonDuration(rhs).count().

STD::CHRONO::DURATION INEQUALITY COMPARISON OPERATOR
Compares two duration objects for inequality, even if they have distinct representations and/or periods.

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator!=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly convert to the other, the expression is ill-formed.

Returns
!(lhs==rhs)

STD::CHRONO::DURATION LESS-THAN COMPARISON OPERATOR
Compares two duration objects to see if one is less than the other, even if they have
distinct representations and/or periods.

The <chrono> header

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly converted to the other, the expression is ill-formed.

Effects
If CommonDuration is a synonym for std::common_type< duration< Rep1, Period1>,
duration<  Rep2,  Period2>>::type,  then  lhs<rhs  returns  CommonDuration(lhs)
.count()<CommonDuration(rhs).count().

STD::CHRONO::DURATION GREATER-THAN COMPARISON OPERATOR
Compares two  duration objects to see if one is greater than the other, even if they
have distinct representations and/or periods.

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly convert to the other, the expression is ill-formed.

Returns
rhs<lhs

STD::CHRONO::DURATION LESS-THAN-OR-EQUALS COMPARISON OPERATOR
Compares two duration objects to see if one is less than or equal to the other, even if
they have distinct representations and/or periods.

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator<=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly convert to the other, the expression is ill-formed.

Returns
!(rhs<lhs)

STD::CHRONO::DURATION GREATER-THAN-OR-EQUALS COMPARISON OPERATOR
Compares  two  duration  objects  to  see  if  one  is  greater  than  or  equal  to  the  other,
even if they have distinct representations and/or periods.

Declaration
```cpp
template <class Rep1, class Period1, class Rep2, class Period2>
constexpr bool operator>=(
    const duration<Rep1, Period1>& lhs,
    const duration<Rep2, Period2>& rhs);
```

Requirements
Either  lhs  must  be  implicitly  convertible  to  rhs,  or  vice  versa.  If  neither  can  be
implicitly converted to the other, or they are distinct instantiations of duration but
each can implicitly convert to the other, the expression is ill-formed.

Returns
!(lhs<rhs)

STD::CHRONO::DURATION_CAST NONMEMBER FUNCTION
```cpp
Explicitly  converts  an  std::chrono::duration  object  to  a  specific  std::chrono::
duration instantiation.
```

Declaration
```cpp
template <class ToDuration, class Rep, class Period>
constexpr ToDuration duration_cast(const duration<Rep, Period>& d);
```

Requirements
ToDuration must be an instantiation of std::chrono::duration.

Returns
The  duration,  d  converted  to  the  duration  type  specified  by  ToDuration.  This  is
done in such a way as to minimize any loss of precision resulting from conversions
between different scales and representation types.

```cpp
D.1.2 std::chrono::time_point class template
```

The std::chrono::time_point class template represents a point in time, as measured by
a particular clock. It’s specified as a duration since the epoch of that particular clock. The
template parameter Clock identifies the clock (each distinct clock must have a unique
type),  whereas  the  Duration  template  parameter  is  the  type  to  use  for  measuring  the
duration since the epoch and must be an instantiation of the std::chrono::duration
class template. The Duration defaults to the default duration type of the Clock.

Class definition
```cpp
template <class Clock,class Duration = typename Clock::duration>
class time_point
{
```

public:
```cpp
    typedef Clock clock;
    typedef Duration duration;
    typedef typename duration::rep rep;
    typedef typename duration::period period;
```

The <chrono> header

```cpp
    time_point();
    explicit time_point(const duration& d);

    template <class Duration2>
    time_point(const time_point<clock, Duration2>& t);

    duration time_since_epoch() const;

    time_point& operator+=(const duration& d);
    time_point& operator-=(const duration& d);

    static constexpr time_point min();
    static constexpr time_point max();
```

};

STD::CHRONO::TIME_POINT DEFAULT CONSTRUCTOR
Constructs a time_point representing the epoch of the associated Clock; the internal
duration is initialized with Duration::zero().

Declaration
```cpp
time_point();
```

Postcondition
For a newly default-constructed time_point object, tp, tp.time_since_epoch() ==
tp::duration::zero().

STD::CHRONO::TIME_POINT DURATION CONSTRUCTOR
Constructs a time_point representing the specified duration since the epoch of the
associated Clock.

Declaration
```cpp
explicit time_point(const duration& d);
```

Postcondition
For a time_point object, tp, constucted with tp(d) for some duration, d, tp.time_
since_epoch()==d.

STD::CHRONO::TIME_POINT CONVERSION CONSTRUCTOR
Constructs a time_point object from another time_point object with the same Clock
but a distinct Duration.

Declaration
```cpp
template <class Duration2>
time_point(const time_point<clock, Duration2>& t);
```

Requirements
Duration2 shall be implicitly convertible to Duration.

Effects
As-if time_point(t.time_since_epoch())

The  value  returned  from  t.time_since_epoch()  is  implicitly  converted  to  an
object of the Duration type, and that value is stored in the newly constructed time_
point object.

STD::CHRONO::TIME_POINT::TIME_SINCE_EPOCH MEMBER FUNCTION
Retrieves the duration since the clock epoch for a particular time_point object.

Declaration
```cpp
duration time_since_epoch() const;
```

Returns
The duration value stored in *this.

STD::CHRONO::TIME_POINT::OPERATOR+= COMPOUND ASSIGNMENT OPERATOR
Adds the specified duration to the value stored in the specified time_point object.

Declaration
```cpp
time_point& operator+=(const duration& d);
```

Effects
Adds d to the internal duration object of *this, as-if

```cpp
this->internal_duration += d;
```

Returns
```cpp
*this
```

STD::CHRONO::TIME_POINT::OPERATOR-= COMPOUND ASSIGNMENT OPERATOR
Subtracts  the  specified  duration  from  the  value  stored  in  the  specified  time_point
object.

Declaration
```cpp
time_point& operator-=(const duration& d);
```

Effects
Subtracts d from the internal duration object of *this, as-if

```cpp
this->internal_duration -= d;
```

Returns
```cpp
*this
```

STD::CHRONO::TIME_POINT::MIN STATIC MEMBER FUNCTION
Obtains a time_point object representing the minimum possible value for its type.

Declaration
```cpp
static constexpr time_point min();
```

Returns
time_point(time_point::duration::min()) (see 11.1.1.15)

STD::CHRONO::TIME_POINT::MAX STATIC MEMBER FUNCTION
Obtains a time_point object representing the maximum possible value for its type.

Declaration
```cpp
static constexpr time_point max();
```

Returns
time_point(time_point::duration::max()) (see 11.1.1.16)

The <chrono> header

```cpp
D.1.3 std::chrono::system_clock class
```

The  std::chrono::system_clock  class  provides  a  means  of  obtaining  the  current
wall-clock time from the system-wide real-time clock. The current time can be obtained
```cpp
by  calling  std::chrono::system_clock::now().  Instances  of  std::chrono::system_
```

clock::time_point  can  be  converted  to  and  from  time_t  with  the  std::chrono::
```cpp
system_clock::to_time_t() and std::chrono::system_clock::to_time_point()
```

functions. The system clock isn’t steady, so a subsequent call to std::chrono::system_
clock::now()  may  return  an  earlier  time  than  a  previous  call  (for  example,  if  the
operating system clock is manually adjusted or synchronized with an external clock).

Class definition
```cpp
class system_clock
{
```

public:
```cpp
    typedef unspecified-integral-type rep;
    typedef std::ratio<unspecified,unspecified> period;
    typedef std::chrono::duration<rep,period> duration;
    typedef std::chrono::time_point<system_clock> time_point;
    static const bool is_steady=unspecified;

    static time_point now() noexcept;

    static time_t to_time_t(const time_point& t) noexcept;
    static time_point from_time_t(time_t t) noexcept;
```

};

STD::CHRONO::SYSTEM_CLOCK::REP TYPEDEF
A typedef for an integral type used to hold the number of ticks in a duration value.

Declaration
```cpp
typedef unspecified-integral-type rep;
```

STD::CHRONO::SYSTEM_CLOCK::PERIOD TYPEDEF
A  typedef  for  an  instantiation  of  the  std::ratio  class  template  that  specifies  the
smallest  number  of  seconds  (or  fractions  of  a  second)  between  distinct  values  of
duration or time_point. The period specifies the precision of the clock, not the tick
frequency.

Declaration
```cpp
typedef std::ratio<unspecified,unspecified> period;
```

STD::CHRONO::SYSTEM_CLOCK::DURATION TYPEDEF
An instantiation of the std::chrono::duration class template that can hold the difference between any two time points returned by the system-wide real-time clock.

Declaration
```cpp
typedef std::chrono::duration<
    std::chrono::system_clock::rep,
    std::chrono::system_clock::period> duration;
```

STD::CHRONO::SYSTEM_CLOCK::TIME_POINT TYPEDEF
An instantiation of the std::chrono::time_point class template that can hold time
points returned by the system-wide real-time clock.

Declaration
```cpp
typedef std::chrono::time_point<std::chrono::system_clock> time_point;
```

STD::CHRONO::SYSTEM_CLOCK::NOW STATIC MEMBER FUNCTION
Obtains the current wall-clock time from the system-wide real-time clock.

Declaration
```cpp
time_point now() noexcept;
```

Returns
A time_point representing the current time of the system-wide real-time clock.

Throws
An exception of type std::system_error if an error occurs.

STD::CHRONO::SYSTEM_CLOCK::TO_TIME_T STATIC MEMBER FUNCTION
Converts an instance of time_point to time_t.

Declaration
```cpp
time_t to_time_t(time_point const& t) noexcept;
```

Returns
A time_t value that represents the same point in time as t, rounded or truncated
to seconds precision.

Throws
An exception of type std::system_error if an error occurs.

STD::CHRONO::SYSTEM_CLOCK::FROM_TIME_T STATIC MEMBER FUNCTION
Converts an instance of time_t to time_point.

Declaration
```cpp
time_point from_time_t(time_t const& t) noexcept;
```

Returns
A time_point value that represents the same point in time as t.

Throws
An exception of type std::system_error if an error occurs.

```cpp
D.1.4 std::chrono::steady_clock class
```

The std::chrono::steady_clock class provides access to the system-wide steady clock.
The  current  time  can  be  obtained  by  calling  std::chrono::steady_clock::now().
```cpp
There  is  no  fixed  relationship  between  values  returned  by  std::chrono::steady_
```

clock::now() and wall-clock time. A steady clock can’t go backwards, so if one call to
```cpp
std::chrono::steady_clock::now()  happens-before  another  call  to  std::chrono
```

::steady_clock::now(), the second call must return a time point equal to or later
than the first. The clock advances at a uniform rate as far as possible.

The <chrono> header

Class definition
```cpp
class steady_clock
{
```

public:
```cpp
    typedef unspecified-integral-type rep;
    typedef std::ratio<
        unspecified,unspecified> period;
    typedef std::chrono::duration<rep,period> duration;
    typedef std::chrono::time_point<steady_clock>
```

        time_point;
```cpp
    static const bool is_steady=true;

    static time_point now() noexcept;
```

};

STD::CHRONO::STEADY_CLOCK::REP TYPEDEF
This  typedef  is  for  an  integral  type  used  to  hold  the  number  of  ticks  in  a  duration
value.

Declaration
```cpp
typedef unspecified-integral-type rep;
```

STD::CHRONO::STEADY_CLOCK::PERIOD TYPEDEF
This is a typedef for an instantiation of the std::ratio class template that specifies
the smallest number of seconds (or fractions of a second) between distinct values of
duration or time_point. The period specifies the precision of the clock, not the tick
frequency.

Declaration
```cpp
typedef std::ratio<unspecified,unspecified> period;
```

STD::CHRONO::STEADY_CLOCK::DURATION TYPEDEF
This  is  an  instantiation  of  the  std::chrono::duration  class  template  that  can  hold
the difference between any two time points returned by the system-wide steady clock.

Declaration
```cpp
typedef std::chrono::duration<
    std::chrono::steady_clock::rep,
    std::chrono::steady_clock::period> duration;
```

STD::CHRONO::STEADY_CLOCK::TIME_POINT TYPEDEF
This  instantiation  of  the  std::chrono::time_point  class  template  can  hold  time
points returned by the system-wide steady clock.

Declaration
```cpp
typedef std::chrono::time_point<std::chrono::steady_clock> time_point;
```

STD::CHRONO::STEADY_CLOCK::NOW STATIC MEMBER FUNCTION
Obtains the current time from the system-wide steady clock.

Declaration
```cpp
time_point now() noexcept;
```

Returns
A time_point representing the current time of the system-wide steady clock.

Throws
An exception of type std::system_error if an error occurs.

Synchronization
If  one  call  to  std::chrono::steady_clock::now()  happens-before  another,  the
time_point returned by the first call shall compare less-than or equal-to the time_
point returned by the second call.

```cpp
D.1.5 std::chrono::high_resolution_clock typedef
```

The std::chrono::high_resolution_clock class provides access to the system-wide
clock with the highest resolution. As for all clocks, the current time can be obtained
```cpp
by  calling  std::chrono::high_resolution_clock::now().  std::chrono::high_
```

resolution_clock may be a typedef for the std::chrono::system_clock class or the
std::chrono::steady_clock class, or it may be a separate type.

 Although std::chrono::high_resolution_clock has the highest resolution of all
```cpp
the library-supplied clocks, std::chrono::high_resolution_clock::now() still takes
```

a  finite  amount  of  time.  You  must  take  care  to  account  for  the  overhead  of  calling
```cpp
std::chrono::high_resolution_clock::now() when timing short operations.

Class definition
class high_resolution_clock
{
```

public:
```cpp
    typedef unspecified-integral-type rep;
    typedef std::ratio<
        unspecified,unspecified> period;
    typedef std::chrono::duration<rep,period> duration;
    typedef std::chrono::time_point<
        unspecified> time_point;
    static const bool is_steady=unspecified;

    static time_point now() noexcept;
```

};

D.2

<condition_variable> header
The  <condition_variable>  header  provides  condition  variables.  These  are  basiclevel synchronization mechanisms that allow a thread to block until notified that some
condition is true or a timeout period has elapsed.

Header contents
```cpp
namespace std
{
    enum class cv_status { timeout, no_timeout };

    class condition_variable;
    class condition_variable_any;
}
```

<condition_variable> header

```cpp
D.2.1 std::condition_variable class
```

The std::condition_variable class allows a thread to wait for a condition to become
```cpp
true. Instances of std::condition_variable aren’t CopyAssignable, CopyConstructible, MoveAssignable, or MoveConstructible.

Class definition
class condition_variable
{
```

public:
```cpp
    condition_variable();
    ~condition_variable();

    condition_variable(condition_variable const& ) = delete;
    condition_variable& operator=(condition_variable const& ) = delete;

    void notify_one() noexcept;
    void notify_all() noexcept;

    void wait(std::unique_lock<std::mutex>& lock);

    template <typename Predicate>
    void wait(std::unique_lock<std::mutex>& lock,Predicate pred);

    template <typename Clock, typename Duration>
    cv_status wait_until(
        std::unique_lock<std::mutex>& lock,
        const std::chrono::time_point<Clock, Duration>& absolute_time);

    template <typename Clock, typename Duration, typename Predicate>
    bool wait_until(
        std::unique_lock<std::mutex>& lock,
        const std::chrono::time_point<Clock, Duration>& absolute_time,
        Predicate pred);

    template <typename Rep, typename Period>
    cv_status wait_for(
        std::unique_lock<std::mutex>& lock,
        const std::chrono::duration<Rep, Period>& relative_time);

    template <typename Rep, typename Period, typename Predicate>
    bool wait_for(
        std::unique_lock<std::mutex>& lock,
        const std::chrono::duration<Rep, Period>& relative_time,
        Predicate pred);
```

};

```cpp
void notify_all_at_thread_exit(condition_variable&,unique_lock<mutex>);
```

STD::CONDITION_VARIABLE DEFAULT CONSTRUCTOR
```cpp
Constructs an std::condition_variable object.
```

Declaration
```cpp
condition_variable();
```

Effects
```cpp
Constructs a new std::condition_variable instance.
```

Throws
An  exception  of  type  std::system_error  if  the  condition  variable  could  not  be
constructed.

STD::CONDITION_VARIABLE DESTRUCTOR
```cpp
Destroys an std::condition_variable object.
```

Declaration
```cpp
~condition_variable();
```

Preconditions
There  are  no  threads  blocked  on  *this  in  a  call  to  wait(),  wait_for(),  or
wait_until().

Effects
Destroys *this.

Throws
Nothing.

STD::CONDITION_VARIABLE::NOTIFY_ONE MEMBER FUNCTION
Wakes one of the threads currently waiting on a std::condition_variable.

Declaration
```cpp
void notify_one() noexcept;
```

Effects
Wakes one of the threads waiting on *this at the point of the call. If there are no
threads waiting, the call has no effect.

Throws
std::system_error if the effects can’t be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE::NOTIFY_ALL MEMBER FUNCTION
Wake all of the threads currently waiting on a std::condition_variable.

Declaration
```cpp
void notify_all() noexcept;
```

Effects
Wakes all of the threads waiting on *this at the point of the call. If there are no
threads waiting, the call has no effect.

Throws
std::system_error if the effects can’t be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

<condition_variable> header

STD::CONDITION_VARIABLE::WAIT MEMBER FUNCTION
Waits  until  std::condition_variable  is  woken  by  a  call  to  notify_one(),  a  call  to
notify_all(), or a spurious wakeup.

Declaration
```cpp
void wait(std::unique_lock<std::mutex>& lock);
```

Preconditions
lock.owns_lock()is true, and the lock is owned by the calling thread.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by
a call to notify_one()or notify_all()by another thread, or the thread is woken
spuriously. The lock object is locked again before the call to wait() returns.

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait(), it’s locked again on exit, even if the function exits via an
exception.

NOTE The  spurious  wakeups  mean  that  a  thread  calling  wait()  may  wake
even though no thread has called notify_one() or notify_all(). It’s therefore recommended that the overload of wait() that takes a predicate is used
in  preference  where  possible.  Otherwise,  it’s  recommended  that  wait()  be
called in a loop that tests the predicate associated with the condition variable.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE::WAIT MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Waits until std::condition_variable is woken by a call to notify_one() or notify_
all(), and the predicate is true.

Declaration
```cpp
template<typename Predicate>
void wait(std::unique_lock<std::mutex>& lock,Predicate pred);
```

Preconditions
The expression pred() shall be valid and shall return a value convertible to bool.
lock.owns_lock() shall be true, and the lock shall be owned by the thread calling
wait().

Effects
As-if

```cpp
while(!pred())
{
    wait(lock);
}
```

Throws
Any exception thrown by a call to pred, or std::system_error if the effects couldn’t
be achieved.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex referenced by lock locked, and the function shall return if (and only if) an evaluation of (bool)pred() returns true.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for() and wait_until() on a
single std::condition_variable instance are serialized. A call to notify_one() or
notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE::WAIT_FOR MEMBER FUNCTION
Waits until std::condition_variable is notified by a call to notify_one() or noti-
fy_all(), or until a specified time period has elapsed or the thread is woken spuriously.

Declaration
```cpp
template<typename Rep,typename Period>
cv_status wait_for(
    std::unique_lock<std::mutex>& lock,
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
lock.owns_lock() is true, and the lock is owned by the calling thread.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by
a  call  to  notify_one()  or  notify_all()  by  another  thread,  or  the  time  period
specified  by  relative_time  has  elapsed,  or  the  thread  is  woken  spuriously.  The
lock object is locked again before the call to wait_for() returns.

Returns
std::cv_status::no_timeout if the thread was woken by a call to notify_one(), a
```cpp
call to notify_all(), or a spurious wakeup, std::cv_status::timeout otherwise.
```

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait_for(), it’s locked again on exit, even if the function exits
via an exception.

NOTE The  spurious  wakeups  mean  that  a  thread  calling  wait_for()  may
wake even though no thread has called notify_one() or notify_all(). It’s
therefore recommended that the overload of wait_for() that takes a predicate is used in preference where possible. Otherwise, it’s recommended that
wait_for() be called in a loop that tests the predicate associated with the condition variable. Care must be taken when doing this to ensure that the timeout
is  still  valid;  wait_until()  may  be  more  appropriate  in  many  circumstances.

<condition_variable> header

The  thread  may  be  blocked  for  longer  than  the  specified  duration.  Where
possible, the elapsed time is determined by a steady clock.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE::WAIT_FOR MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Wait until std::condition_variable is woken by a call to notify_one() or notify_
all() and the predicate is true, or until the specified time period has elapsed.

Declaration
```cpp
template<typename Rep,typename Period,typename Predicate>
bool wait_for(
    std::unique_lock<std::mutex>& lock,
    std::chrono::duration<Rep,Period> const& relative_time,
    Predicate pred);
```

Preconditions
The expression pred() shall be valid and shall return a value that’s convertible to
bool. lock.owns_lock() shall be true, and the lock shall be owned by the thread
calling wait().

Effects
As-if

```cpp
internal_clock::time_point end=internal_clock::now()+relative_time;
while(!pred())
{
    std::chrono::duration<Rep,Period> remaining_time=
        end-internal_clock::now();
    if(wait_for(lock,remaining_time)==std::cv_status::timeout)
        return pred();
}
return true;
```

Returns
true if the most recent call to pred() returned true, false if the time period specified by relative_time has elapsed and pred() returned false.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex
referenced by lock locked, and the function shall return if (and only if) an
evaluation  of  (bool)pred()  returns  true  or  the  time  period  specified  by
relative_time has elapsed. The thread may be blocked for longer than the
specified  duration.  Where  possible,  the  elapsed  time  is  determined  by  a
steady clock.

Throws
Any exception thrown by a call to pred, or std::system_error if the effects couldn’t
be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE::WAIT_UNTIL MEMBER FUNCTION
Waits until std::condition_variable is notified by a call to notify_one() or notify
_all(), until a specified time has been reached, or the thread is woken spuriously.

Declaration
```cpp
template<typename Clock,typename Duration>
cv_status wait_until(
    std::unique_lock<std::mutex>& lock,
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
lock.owns_lock() is true, and the lock is owned by the calling thread.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by a
call to notify_one() or notify_all() by another thread, or Clock::now() returns a
time  equal  to  or  later  than  absolute_time  or  the  thread  is  woken  spuriously.  The
lock object is locked again before the call to wait_until() returns.

Returns
std::cv_status::no_timeout if the thread was woken by a call to notify_one(), a
```cpp
call to notify_all(), or a spurious wakeup, std::cv_status::timeout otherwise.
```

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait_until(), it’s locked again on exit, even if the function exits
via an exception.

NOTE The spurious wakeups mean that a thread calling wait_until() may
wake even though no thread has called notify_one() or notify_all(). It’s
therefore recommended that the overload of wait_until() that takes a predicate is used in preference where possible. Otherwise, it’s recommended that
wait_until() be called in a loop that tests the predicate associated with the
condition  variable.  There’s  no  guarantee  as  to  how  long  the  calling  thread
will be blocked, only that if the function returns false, then Clock::now()
returns a time equal to or later than absolute_time at the point at which the
thread became unblocked.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single std::condition_variable instance are serialized. A call to notify_one()
```

or notify_all() will only wake threads that started waiting prior to that call.

<condition_variable> header

STD::CONDITION_VARIABLE::WAIT_UNTIL MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Wait until std::condition_variable is woken by a call to notify_one() or notify_
all() and the predicate is true, or until the specified time has been reached.

Declaration
```cpp
template<typename Clock,typename Duration,typename Predicate>
bool wait_until(
    std::unique_lock<std::mutex>& lock,
    std::chrono::time_point<Clock,Duration> const& absolute_time,
    Predicate pred);
```

Preconditions
The expression pred() shall be valid and shall return a value convertible to bool.
lock.owns_lock() shall be true, and the lock shall be owned by the thread calling
wait().

Effects
As-if

```cpp
while(!pred())
{
    if(wait_until(lock,absolute_time)==std::cv_status::timeout)
        return pred();
}
return true;
```

Returns
true if the most recent call to pred() returned true, false if a call to Clock::now()
returned  a  time  equal  to  or  later  than  the  time  specified  by  absolute_time  and
pred() returned false.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex referenced by lock locked, and the function shall return if (and only if) an evaluation of (bool)pred() returns true or Clock::now() returns a time equal to
or later than absolute_time. There’s no guarantee as to how long the calling
thread will be blocked, only that if the function returns false, then Clock::
now()  returns  a  time  equal  to  or  later  than  absolute_time  at  the  point  at
which the thread became unblocked.

Throws
Any exception thrown by a call to pred, or std::system_error if the effects couldn’t
be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_until(), and wait_until() on
a single std::condition_variable instance are serialized. A call to notify_one() or
notify_all() will wake only threads that started waiting prior to that call.

STD::NOTIFY_ALL_AT_THREAD_EXIT NONMEMBER FUNCTION
Wake all of the threads waiting on a specific a std::condition_variable when the
current thread exits.

Declaration
```cpp
void notify_all_at_thread_exit(
    condition_variable& cv,unique_lock<mutex> lk);
```

Preconditions
lk.owns_lock() is true, and the lock is owned by the calling thread. lk.mutex()
shall  return  the  same  value  as  for  any  of  the  lock  objects  supplied  to  wait(),
wait_for(), or wait_until() on cv from concurrently waiting threads.

Effects
Transfers ownership of the lock held by lk into internal storage and schedules cv
to be notified when the calling thread exits. This notification shall be as-if

```cpp
lk.unlock();
cv.notify_all();
```

Throws
std::system_error if the effects can’t be achieved.

NOTE The lock is held until the thread exits, so care must be taken to avoid
deadlock.  It’s  recommended  that  the  calling  thread  should  exit  as  soon  as
possible and that no blocking operations be performed on this thread.

The  user  should  ensure  that  waiting  threads  don’t  erroneously  assume  that  the
thread has exited when they are woken, particularly with the potential for spurious
wakeups. This can be achieved by testing a predicate on the waiting thread that’s
only  made  true  by  the  notifying  thread  under  the  protection  of  the  mutex  and
without releasing the lock on the mutex prior to the call of notify_all_at_thread
```cpp
_exit.std::condition_variable_any class.

D.2.2 std::condition_variable_any class
```

The  std::condition_variable_any  class  allows  a  thread  to  wait  for  a  condition  to
become true. Whereas std::condition_variable can be used only with std::unique_
lock<std::mutex>,  std::condition_variable_any  can  be  used  with  any  type  that
meets the Lockable requirements.

```cpp
  Instances  of  std::condition_variable_any  aren’t  CopyAssignable,  Copy-
```

Constructible, MoveAssignable, or MoveConstructible.

Class definition
```cpp
class condition_variable_any
{
```

public:
```cpp
    condition_variable_any();
    ~condition_variable_any();

    condition_variable_any(
        condition_variable_any const& ) = delete;
```

<condition_variable> header

    condition_variable_any& operator=(
```cpp
        condition_variable_any const& ) = delete;

    void notify_one() noexcept;
    void notify_all() noexcept;

    template<typename Lockable>
    void wait(Lockable& lock);

    template <typename Lockable, typename Predicate>
    void wait(Lockable& lock, Predicate pred);

    template <typename Lockable, typename Clock,typename Duration>
    std::cv_status wait_until(
        Lockable& lock,
        const std::chrono::time_point<Clock, Duration>& absolute_time);

    template <
        typename Lockable, typename Clock,
        typename Duration, typename Predicate>
    bool wait_until(
        Lockable& lock,
        const std::chrono::time_point<Clock, Duration>& absolute_time,
        Predicate pred);

    template <typename Lockable, typename Rep, typename Period>
    std::cv_status wait_for(
        Lockable& lock,
        const std::chrono::duration<Rep, Period>& relative_time);

    template <
        typename Lockable, typename Rep,
        typename Period, typename Predicate>
    bool wait_for(
        Lockable& lock,
        const std::chrono::duration<Rep, Period>& relative_time,
        Predicate pred);
```

};

STD::CONDITION_VARIABLE_ANY DEFAULT CONSTRUCTOR
```cpp
Constructs an std::condition_variable_any object.
```

Declaration
```cpp
condition_variable_any();
```

Effects
```cpp
Constructs a new std::condition_variable_any instance.
```

Throws
An exception of type std::system_error if the condition variable couldn’t be constructed.

STD::CONDITION_VARIABLE_ANY DESTRUCTOR
```cpp
Destroys an std::condition_variable_any object.
```

Declaration
```cpp
~condition_variable_any();
```

Preconditions
There are no threads blocked on *this in a call to wait(), wait_for(), or wait_
until().

Effects
Destroys *this.

Throws
Nothing.

STD::CONDITION_VARIABLE_ANY::NOTIFY_ONE MEMBER FUNCTION
Wakes one of the threads currently waiting on a specific a std::condition_variable
_any.

Declaration
```cpp
void notify_one() noexcept;
```

Effects
Wakes one of the threads waiting on *this at the point of the call. If there are no
threads waiting, the call has no effect.

Throws
std::system_error if the effects can’t be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::NOTIFY_ALL MEMBER FUNCTION
Wakes all of the threads currently waiting on a specific a std::condition_variable
_any.

Declaration
```cpp
void notify_all() noexcept;
```

Effects
Wakes all of the threads waiting on *this at the point of the call. If there are no
threads waiting, the call has no effect.

Throws
std::system_error if the effects can’t be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::WAIT MEMBER FUNCTION
Waits until std::condition_variable_any is woken by a call to notify_one(), a call
to notify_all(), or a spurious wakeup.

Declaration
```cpp
template<typename Lockable>
void wait(Lockable& lock);
```

<condition_variable> header

Preconditions
Lockable meets the Lockable requirements, and lock owns a lock.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by
a call to notify_one() or notify_all() by another thread, or the thread is woken
spuriously. The lock object is locked again before the call to wait() returns.

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait(), it’s locked again on exit, even if the function exits via an
exception.

NOTE The  spurious  wakeups  mean  that  a  thread  calling  wait()  may  wake
even though no thread has called notify_one() or notify_all(). It’s therefore recommended that the overload of wait() that takes a predicate is used
in  preference  where  possible.  Otherwise,  it’s  recommended  that  wait()  be
called in a loop that tests the predicate associated with the condition variable.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to  notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::WAIT MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Waits  until  std::condition_variable_any  is  woken  by  a  call  to  notify_one()  or
notify_all() and the predicate is true.

Declaration
```cpp
template<typename Lockable,typename Predicate>
void wait(Lockable& lock,Predicate pred);
```

Preconditions
The expression pred() shall be valid and shall return a value that’s convertible to
bool. Lockable meets the Lockable requirements, and lock owns a lock.

Effects
As-if

```cpp
while(!pred())
{
    wait(lock);
}
```

Throws
Any exception thrown by a call to pred, or std::system_error if the effects could
not be achieved.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex referenced by lock locked, and the function shall return if (and only if) an evaluation of (bool)pred() returns true.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::WAIT_FOR MEMBER FUNCTION
Waits  until  std::condition_variable_any  is  notified  by  a  call  to  notify_one()  or
notify_all(), until a specified time period has elapsed, or the thread is woken spuriously.

Declaration
```cpp
template<typename Lockable,typename Rep,typename Period>
std::cv_status wait_for(
    Lockable& lock,
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
Lockable meets the Lockable requirements, and lock owns a lock.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by
a call to notify_one() or notify_all() by another thread or the time period specified  by  relative_time  has  elapsed  or  the  thread  is  woken  spuriously.  The  lock
object is locked again before the call to wait_for() returns.

Returns
std::cv_status::no_timeout if the thread was woken by a call to notify_one(), a
```cpp
call to notify_all(), or a spurious wakeup, std::cv_status::timeout otherwise.
```

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait_for(), it’s locked again on exit, even if the function exits
via an exception.

NOTE The  spurious  wakeups  mean  that  a  thread  calling  wait_for()  may
wake even though no thread has called notify_one() or notify_all(). It’s
therefore recommended that the overload of wait_for() that takes a predicate is used in preference where possible. Otherwise, it’s recommended that
wait_for()  be  called  in  a  loop  that  tests  the  predicate  associated  with  the
condition  variable.  Care  must  be  taken  when  doing  this  to  ensure  that  the
timeout is still valid; wait_until() may be more appropriate in many circumstances. The thread may be blocked for longer than the specified duration.
Where possible, the elapsed time is determined by a steady clock.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

<condition_variable> header

STD::CONDITION_VARIABLE_ANY::WAIT_FOR MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Waits until std::condition_variable_any is woken by a call to notify_one() or notify
_all() and the predicate is true, or until the specified time period has elapsed.

Declaration
```cpp
template<typename Lockable,typename Rep,
    typename Period, typename Predicate>
bool wait_for(
    Lockable& lock,
    std::chrono::duration<Rep,Period> const& relative_time,
    Predicate pred);
```

Preconditions
The expression pred() shall be valid and shall return a value that’s convertible to
bool. Lockable meets the Lockable requirements, and lock owns a lock.

Effects
As-if

```cpp
internal_clock::time_point end=internal_clock::now()+relative_time;
while(!pred())
{
    std::chrono::duration<Rep,Period> remaining_time=
        end-internal_clock::now();
    if(wait_for(lock,remaining_time)==std::cv_status::timeout)
        return pred();
}
return true;
```

Returns
true if the most recent call to pred() returned true, false if the time period specified by relative_time has elapsed and pred() returned false.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex
referenced by lock locked, and the function shall return if (and only if) an
evaluation  of  (bool)pred()  returns  true  or  the  time  period  specified  by
relative_time has elapsed. The thread may be blocked for longer than the
specified  duration.  Where  possible,  the  elapsed  time  is  determined  by  a
steady clock.

Throws
Any exception thrown by a call to pred, or std::system_error if the effects couldn’t
be achieved.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to  notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::WAIT_UNTIL MEMBER FUNCTION
Waits until std::condition_variable_any is notified by a call to notify_one() or
notify_all(),  until  a  specified  time  has  been  reached,  or  the  thread  is  woken
spuriously.

Declaration
```cpp
template<typename Lockable,typename Clock,typename Duration>
std::cv_status wait_until(
    Lockable& lock,
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
Lockable meets the Lockable requirements, and lock owns a lock.

Effects
Atomically unlocks the supplied lock object and block until the thread is woken by
a call to notify_one() or notify_all() by another thread, Clock::now() returns
a time equal to or later than absolute_time, or the thread is woken spuriously. The
lock object is locked again before the call to wait_until() returns.

Returns
std::cv_status::no_timeout if the thread was woken by a call to notify_one(), a
```cpp
call to notify_all(), or a spurious wakeup, std::cv_status::timeout otherwise.
```

Throws
std::system_error if the effects can’t be achieved. If the lock object is unlocked
during the call to wait_until(), it’s locked again on exit, even if the function exits
via an exception.

NOTE The spurious wakeups mean that a thread calling wait_until() may
wake even though no thread has called notify_one() or notify_all(). It’s
therefore recommended that the overload of wait_until() that takes a predicate is used in preference where possible. Otherwise, it’s recommended that
wait_until() be called in a loop that tests the predicate associated with the
condition  variable.  There’s  no  guarantee  as  to  how  long  the  calling  thread
will be blocked, only that if the function returns false, then Clock::now()
returns a time equal to or later than absolute_time at the point at which the
thread became unblocked.

Synchronization
Calls to notify_one(), notify_all(), wait(), wait_for(), and wait_until() on
```cpp
a single  std::condition_variable_any instance are serialized. A call to notify_
```

one() or notify_all() will only wake threads that started waiting prior to that call.

STD::CONDITION_VARIABLE_ANY::WAIT_UNTIL MEMBER FUNCTION OVERLOAD THAT TAKES A PREDICATE
Waits  until  std::condition_variable_any  is  woken  by  a  call  to  notify_one()  or
notify_all() and the predicate is true, or until the specified time has been reached.

Declaration
```cpp
template<typename Lockable,typename Clock,
    typename Duration, typename Predicate>
```

<atomic> header

```cpp
bool wait_until(
    Lockable& lock,
    std::chrono::time_point<Clock,Duration> const& absolute_time,
    Predicate pred);
```

Preconditions
The expression pred() shall be valid, and shall return a value that’s convertible to
bool. Lockable meets the Lockable requirements, and lock owns a lock.

Effects
As-if

```cpp
while(!pred())
{
    if(wait_until(lock,absolute_time)==std::cv_status::timeout)
        return pred();
}
return true;
```

Returns
true  if  the  most  recent  call  to  pred()  returned  true,  false  if  a  call  to  Clock::
now() returned a time equal to or later than the time specified by absolute_time,
and pred() returned false.

NOTE The  potential  for  spurious  wakeups  means  that  it’s  unspecified  how
many times pred will be called. pred will always be invoked with the mutex referenced by lock locked, and the function shall return if (and only if) an evaluation of (bool)pred() returns true or Clock::now() returns a time equal to
or later than absolute_time. There’s no guarantee as to how long the calling
thread will be blocked, only that if the function returns false, then Clock::
now()  returns  a  time  equal  to  or  later  than  absolute_time  at  the  point  at
which the thread became unblocked.

Throws
Any exception thrown by a call to pred, or std::system_error if the effects couldn’t
be achieved.

Synchronization
Calls  to  notify_one(),  notify_all(),  wait(),  wait_until(),  and  wait_until()
on a single std::condition_variable_any instance are serialized. A call to notify_
one() or notify_all() will only wake threads that started waiting prior to that call.

D.3

<atomic> header
The <atomic> header provides the set of basic atomic types and operations on those
types and a class template for constructing an atomic version of a user-defined type
that meets certain criteria.

Header contents
```cpp
#define ATOMIC_BOOL_LOCK_FREE see description
#define ATOMIC_CHAR_LOCK_FREE see description
#define ATOMIC_SHORT_LOCK_FREE see description

#define ATOMIC_INT_LOCK_FREE see description
#define ATOMIC_LONG_LOCK_FREE see description
#define ATOMIC_LLONG_LOCK_FREE see description
#define ATOMIC_CHAR16_T_LOCK_FREE see description
#define ATOMIC_CHAR32_T_LOCK_FREE see description
#define ATOMIC_WCHAR_T_LOCK_FREE see description
#define ATOMIC_POINTER_LOCK_FREE see description

#define ATOMIC_VAR_INIT(value) see description

namespace std
{
    enum memory_order;

    struct atomic_flag;
    typedef see description atomic_bool;
    typedef see description atomic_char;
    typedef see description atomic_char16_t;
    typedef see description atomic_char32_t;
    typedef see description atomic_schar;
    typedef see description atomic_uchar;
    typedef see description atomic_short;
    typedef see description atomic_ushort;
    typedef see description atomic_int;
    typedef see description atomic_uint;
    typedef see description atomic_long;
    typedef see description atomic_ulong;
    typedef see description atomic_llong;
    typedef see description atomic_ullong;
    typedef see description atomic_wchar_t;

    typedef see description atomic_int_least8_t;
    typedef see description atomic_uint_least8_t;
    typedef see description atomic_int_least16_t;
    typedef see description atomic_uint_least16_t;
    typedef see description atomic_int_least32_t;
    typedef see description atomic_uint_least32_t;
    typedef see description atomic_int_least64_t;
    typedef see description atomic_uint_least64_t;
    typedef see description atomic_int_fast8_t;
    typedef see description atomic_uint_fast8_t;
    typedef see description atomic_int_fast16_t;
    typedef see description atomic_uint_fast16_t;
    typedef see description atomic_int_fast32_t;
    typedef see description atomic_uint_fast32_t;
    typedef see description atomic_int_fast64_t;
    typedef see description atomic_uint_fast64_t;
    typedef see description atomic_int8_t;
    typedef see description atomic_uint8_t;
    typedef see description atomic_int16_t;
    typedef see description atomic_uint16_t;
    typedef see description atomic_int32_t;
    typedef see description atomic_uint32_t;
    typedef see description atomic_int64_t;
    typedef see description atomic_uint64_t;
    typedef see description atomic_intptr_t;
    typedef see description atomic_uintptr_t;
```

<atomic> header

```cpp
    typedef see description atomic_size_t;
    typedef see description atomic_ssize_t;
    typedef see description atomic_ptrdiff_t;
    typedef see description atomic_intmax_t;
    typedef see description atomic_uintmax_t;

    template<typename T>
    struct atomic;

    extern "C" void atomic_thread_fence(memory_order order);
    extern "C" void atomic_signal_fence(memory_order order);

    template<typename T>
    T kill_dependency(T);
}

D.3.1 std::atomic_xxx typedefs
```

For compatibility with the forthcoming C Standard, typedefs for the atomic integral
types  are  provided.  For  C++17,  these  must  be  typedefs  to  the  corresponding  std::
atomic<T> specialization; for prior C++ standards, they may instead be a base class of
that specialization with the same interface.

```cpp
Table D.1 Atomic typedefs and their corresponding std::atomic<> specializations

std::atomic_itype

std::atomic<> specialization

std::atomic_char

std::atomic<char>

std::atomic_schar

std::atomic<signed char>

std::atomic_uchar

std::atomic<unsigned char>

std::atomic_short

std::atomic<short>

std::atomic_ushort

std::atomic<unsigned short>

std::atomic_int

std::atomic_uint

std::atomic_long

std::atomic<int>

std::atomic<unsigned int>

std::atomic<long>

std::atomic_ulong

std::atomic<unsigned long>

std::atomic_llong

std::atomic<long long>

std::atomic_ullong

std::atomic<unsigned long long>

std::atomic_wchar_t

std::atomic<wchar_t>

std::atomic_char16_t

std::atomic<char16_t>

std::atomic_char32_t

std::atomic<char32_t>
```

D.3.2 ATOMIC_xxx_LOCK_FREE macros

These  macros  specify  whether  the  atomic  types  corresponding  to  particular  built-in
types are lock-free.

Macro declarations
```cpp
#define ATOMIC_BOOL_LOCK_FREE see description
#define ATOMIC_CHAR_LOCK_FREE see description
#define ATOMIC_SHORT_LOCK_FREE see description
#define ATOMIC_INT_LOCK_FREE see description
#define ATOMIC_LONG_LOCK_FREE see description
#define ATOMIC_LLONG_LOCK_FREE see description
#define ATOMIC_CHAR16_T_LOCK_FREE see description
#define ATOMIC_CHAR32_T_LOCK_FREE see description
#define ATOMIC_WCHAR_T_LOCK_FREE see description
#define ATOMIC_POINTER_LOCK_FREE see description
```

The  value  of  ATOMIC_xxx_LOCK_FREE  is  either  0,  1,  or  2.  A  value  of  0  means  that
operations  on  both  the  signed  and  unsigned  atomic  types  corresponding  to  the
named type are never lock-free, a value of 1 means that the operations may be lockfree  for  particular  instances  of  those  types  and  not  for  others,  and  a  value  of  2
means  that  the  operations  are  always  lock-free.  For  example,  if  ATOMIC_INT_
LOCK_FREE  is  2,  operations  on  instances  of  std::atomic<int>  and  std::atomic
<unsigned> are always lock-free.

The ATOMIC_POINTER_LOCK_FREE macro describes the lock-free property of operations on the atomic pointer specializations std::atomic<T*>.

D.3.3 ATOMIC_VAR_INIT macro

The ATOMIC_VAR_INIT macro provides a means of initializing an atomic variable to a
particular value.

Declaration
```cpp
#define ATOMIC_VAR_INIT(value) see description
```

The macro expands to a token sequence that can be used to initialize one of the standard atomic types with the specified value in an expression of the following form:

```cpp
std::atomic<type> x = ATOMIC_VAR_INIT(val);
```

The specified value must be compatible with the nonatomic type corresponding to
the atomic variable; for example:

```cpp
std::atomic<int> i = ATOMIC_VAR_INIT(42);
std::string s;
std::atomic<std::string*> p = ATOMIC_VAR_INIT(&s);
```

This initialization is not atomic, and any access by another thread to the variable
being initialized where the initialization doesn’t happen-before that access is a data
race and thus undefined behavior.

<atomic> header

```cpp
D.3.4 std::memory_order enumeration
```

The  std::memory_order  enumeration  is  used  to  specify  the  ordering  constraints  of
atomic operations.

Declaration
```cpp
typedef enum memory_order
{
    memory_order_relaxed,memory_order_consume,
    memory_order_acquire,memory_order_release,
```

    memory_order_acq_rel,memory_order_seq_cst
} memory_order;

Operations  tagged  with  the  various  memory  order  values  behave  as  follows  (see

STD::MEMORY_ORDER_RELAXED
The operation doesn’t provide any additional ordering constraints.

STD::MEMORY_ORDER_RELEASE
The operation is a release operation on the specified memory location. This therefore
synchronizes-with an acquire operation on the same memory location that reads the
stored value.

STD::MEMORY_ORDER_ACQUIRE
The operation is an acquire operation on the specified memory location. If the stored
value was written by a release operation, that store synchronizes-with this operation.

STD::MEMORY_ORDER_ACQ_REL
The operation must be a read-modify-write operation, and it behaves as both  std::
memory_order_acquire and std::memory_order_release on the specified location.

STD::MEMORY_ORDER_SEQ_CST
The  operation  forms  part  of  the  single  global  total  order  of  sequentially  consistent
operations. In addition, if it’s a store, it behaves like an std::memory_order_release
operation;  if  it’s  a  load,  it  behaves  like  an  std::memory_order_acquire  operation;
and  if  it’s  a  read-modify-write  operation,  it  behaves  as  both  std::memory_order_
acquire and std::memory_order_release. This is the default for all operations.

STD::MEMORY_ORDER_CONSUME
The operation is a consume operation on the specified memory location. The C++17
Standard states that this memory ordering should not be used.

```cpp
D.3.5 std::atomic_thread_fence function
```

The std::atomic_thread_fence() function inserts a “memory barrier” or “fence” in
the code to force memory-ordering constraints between operations.

Declaration
```cpp
extern "C" void atomic_thread_fence(std::memory_order order);
```

Effects
Inserts a fence with the required memory-ordering constraints.

A  fence  with  an  order  of  std::memory_order_release,  std::memory_order_
acq_rel, or  std::memory_order_seq_cst synchronizes-with an acquire operation
on the same memory location if that acquire operation reads a value stored by an
atomic operation following the fence on the same thread as the fence.

A  release  operation  synchronizes-with  a  fence  with  an  order  of  std::memory
```cpp
_order_acquire, std::memory_order_acq_rel, or std::memory_order_seq_cst if
```

that release operation stores a value that’s read by an atomic operation prior to the
fence on the same thread as the fence.

Throws
Nothing.

```cpp
D.3.6 std::atomic_signal_fence function
```

The std::atomic_signal_fence() function inserts a memory barrier or fence in the
code to force memory ordering constraints between operations on a thread and operations in a signal handler on that thread.

Declaration
```cpp
extern "C" void atomic_signal_fence(std::memory_order order);
```

Effects
Inserts a fence with the required memory-ordering constraints. This is equivalent to
```cpp
std::atomic_thread_fence(order) except that the constraints apply only between
```

a thread and a signal handler on the same thread.

Throws
Nothing.

```cpp
D.3.7 std::atomic_flag class
```

The  std::atomic_flag  class  provides  a  simple  bare-bones  atomic  flag.  It’s  the  only
data  type  that’s  guaranteed  to  be  lock-free  by  the  C++11  Standard  (although  many
atomic types will be lock-free in most implementations).

 An instance of std::atomic_flag is either set or clear.

Class definition
```cpp
struct atomic_flag
{
    atomic_flag() noexcept = default;
    atomic_flag(const atomic_flag&) = delete;
    atomic_flag& operator=(const atomic_flag&) = delete;
    atomic_flag& operator=(const atomic_flag&) volatile = delete;

    bool test_and_set(memory_order = memory_order_seq_cst) volatile
```

noexcept;

```cpp
    bool test_and_set(memory_order = memory_order_seq_cst) noexcept;
    void clear(memory_order = memory_order_seq_cst) volatile noexcept;
    void clear(memory_order = memory_order_seq_cst) noexcept;
```

};

<atomic> header

```cpp
bool atomic_flag_test_and_set(volatile atomic_flag*) noexcept;
bool atomic_flag_test_and_set(atomic_flag*) noexcept;
bool atomic_flag_test_and_set_explicit(
    volatile atomic_flag*, memory_order) noexcept;
bool atomic_flag_test_and_set_explicit(
    atomic_flag*, memory_order) noexcept;
void atomic_flag_clear(volatile atomic_flag*) noexcept;
void atomic_flag_clear(atomic_flag*) noexcept;
void atomic_flag_clear_explicit(
    volatile atomic_flag*, memory_order) noexcept;
void atomic_flag_clear_explicit(
    atomic_flag*, memory_order) noexcept;

#define ATOMIC_FLAG_INIT unspecified
```

STD::ATOMIC_FLAG DEFAULT CONSTRUCTOR
It’s unspecified whether a default-constructed instance of std::atomic_flag is clear
or set. For objects of static storage duration, initialization shall be static initialization.

Declaration
```cpp
std::atomic_flag() noexcept = default;
```

Effects
```cpp
Constructs a new std::atomic_flag object in an unspecified state.
```

Throws
Nothing.

STD::ATOMIC_FLAG INITIALIZATION WITH ATOMIC_FLAG_INIT
An  instance  of  std::atomic_flag  may  be  initialized  using  the  ATOMIC_FLAG_INIT
macro,  in  which  case  it’s  initialized  into  the  clear  state.  For  objects  of  static  storage
duration, initialization shall be static initialization.

Declaration
```cpp
#define ATOMIC_FLAG_INIT unspecified
```

Usage
```cpp
std::atomic_flag flag=ATOMIC_FLAG_INIT;
```

Effects
```cpp
Constructs a new std::atomic_flag object in the clear state.
```

Throws
Nothing.

STD::ATOMIC_FLAG::TEST_AND_SET MEMBER FUNCTION
Atomically sets the flag and checks whether or not it was set.

Declaration
```cpp
bool test_and_set(memory_order order = memory_order_seq_cst) volatile
```

noexcept;

```cpp
bool test_and_set(memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically sets the flag.

Returns
true if the flag was set at the point of the call, false if the flag was clear.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FLAG_TEST_AND_SET NONMEMBER FUNCTION
Atomically sets the flag and checks whether or not it was set.

Declaration
```cpp
bool atomic_flag_test_and_set(volatile atomic_flag* flag) noexcept;
bool atomic_flag_test_and_set(atomic_flag* flag) noexcept;
```

Effects
```cpp
return flag->test_and_set();
```

STD::ATOMIC_FLAG_TEST_AND_SET_EXPLICIT NONMEMBER FUNCTION
Atomically sets the flag and checks whether or not it was set.

Declaration
```cpp
bool atomic_flag_test_and_set_explicit(
    volatile atomic_flag* flag, memory_order order) noexcept;
bool atomic_flag_test_and_set_explicit(
    atomic_flag* flag, memory_order order) noexcept;
```

Effects
```cpp
return flag->test_and_set(order);
```

STD::ATOMIC_FLAG::CLEAR MEMBER FUNCTION
Atomically clears the flag.

Declaration
```cpp
void clear(memory_order order = memory_order_seq_cst) volatile noexcept;
void clear(memory_order order = memory_order_seq_cst) noexcept;
```

Preconditions
The  supplied  order  must  be  one  of  std::memory_order_relaxed,  std::memory_
```cpp
order_release, or std::memory_order_seq_cst.
```

Effects
Atomically clears the flag.

Throws
Nothing.

NOTE This is an atomic store operation for the memory location comprising
```cpp
*this.
```

<atomic> header

STD::ATOMIC_FLAG_CLEAR NONMEMBER FUNCTION
Atomically clears the flag.

Declaration
```cpp
void atomic_flag_clear(volatile atomic_flag* flag) noexcept;
void atomic_flag_clear(atomic_flag* flag) noexcept;
```

Effects
```cpp
flag->clear();
```

STD::ATOMIC_FLAG_CLEAR_EXPLICIT NONMEMBER FUNCTION
Atomically clears the flag.

Declaration
```cpp
void atomic_flag_clear_explicit(
    volatile atomic_flag* flag, memory_order order) noexcept;
void atomic_flag_clear_explicit(
    atomic_flag* flag, memory_order order) noexcept;
```

Effects
```cpp
return flag->clear(order);

D.3.8 std::atomic class template
```

The  std::atomic  class  provides  a  wrapper  with  atomic  operations  for  any  type  that
satisfies the following requirements.

 The template parameter BaseType must

- Have a trivial default constructor
- Have a trivial copy-assignment operator
- Have a trivial destructor
- Be bitwise-equality comparable

This means that std::atomic<some-built-in-type> is fine, as is std::atomic<somesimple-struct>, but things like std::atomic<std::string> are not.

 In addition to the primary template, there are specializations for the built-in integral types and pointers to provide additional operations, such as x++.

 Instances of std::atomic are not CopyConstructible or CopyAssignable, because

these operations can’t be performed as a single atomic operation.

Class definition
```cpp
template<typename BaseType>
struct atomic
{
    using value_type = T;
    static constexpr bool is_always_lock_free = implementation-defined ;
    atomic() noexcept = default;
    constexpr atomic(BaseType) noexcept;
    BaseType operator=(BaseType) volatile noexcept;
    BaseType operator=(BaseType) noexcept;

    atomic(const atomic&) = delete;
    atomic& operator=(const atomic&) = delete;
    atomic& operator=(const atomic&) volatile = delete;

    bool is_lock_free() const volatile noexcept;
    bool is_lock_free() const noexcept;
    void store(BaseType,memory_order = memory_order_seq_cst)
```

        volatile noexcept;
```cpp
    void store(BaseType,memory_order = memory_order_seq_cst) noexcept;
    BaseType load(memory_order = memory_order_seq_cst)
        const volatile noexcept;
    BaseType load(memory_order = memory_order_seq_cst) const noexcept;
    BaseType exchange(BaseType,memory_order = memory_order_seq_cst)
```

        volatile noexcept;
    BaseType exchange(BaseType,memory_order = memory_order_seq_cst)
        noexcept;

```cpp
    bool compare_exchange_strong(
        BaseType & old_value, BaseType new_value,
        memory_order order = memory_order_seq_cst) volatile noexcept;
    bool compare_exchange_strong(
        BaseType & old_value, BaseType new_value,
        memory_order order = memory_order_seq_cst) noexcept;
    bool compare_exchange_strong(
        BaseType & old_value, BaseType new_value,
        memory_order success_order,
        memory_order failure_order) volatile noexcept;
    bool compare_exchange_strong(
        BaseType & old_value, BaseType new_value,
        memory_order success_order,
        memory_order failure_order) noexcept;
    bool compare_exchange_weak(
        BaseType & old_value, BaseType new_value,
        memory_order order = memory_order_seq_cst)
```

        volatile noexcept;
```cpp
    bool compare_exchange_weak(
        BaseType & old_value, BaseType new_value,
        memory_order order = memory_order_seq_cst) noexcept;
    bool compare_exchange_weak(
        BaseType & old_value, BaseType new_value,
        memory_order success_order,
        memory_order failure_order) volatile noexcept;
    bool compare_exchange_weak(
        BaseType & old_value, BaseType new_value,
        memory_order success_order,
        memory_order failure_order) noexcept;

    operator BaseType () const volatile noexcept;
    operator BaseType () const noexcept;
```

};

```cpp
template<typename BaseType>
bool atomic_is_lock_free(volatile const atomic<BaseType>*) noexcept;
template<typename BaseType>
bool atomic_is_lock_free(const atomic<BaseType>*) noexcept;
template<typename BaseType>
void atomic_init(volatile atomic<BaseType>*, void*) noexcept;
template<typename BaseType>
void atomic_init(atomic<BaseType>*, void*) noexcept;
template<typename BaseType>
```

<atomic> header

BaseType atomic_exchange(volatile atomic<BaseType>*, memory_order)
    noexcept;
```cpp
template<typename BaseType>
BaseType atomic_exchange(atomic<BaseType>*, memory_order) noexcept;
template<typename BaseType>
BaseType atomic_exchange_explicit(
    volatile atomic<BaseType>*, memory_order) noexcept;
template<typename BaseType>
BaseType atomic_exchange_explicit(
    atomic<BaseType>*, memory_order) noexcept;
template<typename BaseType>
void atomic_store(volatile atomic<BaseType>*, BaseType) noexcept;
template<typename BaseType>
void atomic_store(atomic<BaseType>*, BaseType) noexcept;
template<typename BaseType>
void atomic_store_explicit(
    volatile atomic<BaseType>*, BaseType, memory_order) noexcept;
template<typename BaseType>
void atomic_store_explicit(
    atomic<BaseType>*, BaseType, memory_order) noexcept;
template<typename BaseType>
BaseType atomic_load(volatile const atomic<BaseType>*) noexcept;
template<typename BaseType>
BaseType atomic_load(const atomic<BaseType>*) noexcept;
template<typename BaseType>
BaseType atomic_load_explicit(
    volatile const atomic<BaseType>*, memory_order) noexcept;
template<typename BaseType>
BaseType atomic_load_explicit(
    const atomic<BaseType>*, memory_order) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_strong(
    volatile atomic<BaseType>*,BaseType * old_value,
    BaseType new_value) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_strong(
    atomic<BaseType>*,BaseType * old_value,
    BaseType new_value) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_strong_explicit(
    volatile atomic<BaseType>*,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_strong_explicit(
    atomic<BaseType>*,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_weak(
    volatile atomic<BaseType>*,BaseType * old_value,BaseType new_value)
```

    noexcept;
```cpp
template<typename BaseType>
bool atomic_compare_exchange_weak(
    atomic<BaseType>*,BaseType * old_value,BaseType new_value) noexcept;

template<typename BaseType>
bool atomic_compare_exchange_weak_explicit(
    volatile atomic<BaseType>*,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_weak_explicit(
    atomic<BaseType>*,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
```

NOTE Although  the  nonmember  functions  are  specified  as  templates,  they
may be provided as an overloaded set of functions, and explicit specification
of the template arguments shouldn’t be used.

STD::ATOMIC DEFAULT CONSTRUCTOR
Constructs an instance of std::atomic with a default-initialized value.

Declaration
```cpp
atomic() noexcept;
```

Effects
```cpp
Constructs  a  new  std::atomic  object  with  a  default-initialized  value.  For  objects
```

with static storage duration, this is static initialization.

```cpp
Instances  of  std::atomic  with  nonstatic  storage  duration  initialized
```

NOTE
with the default constructor can’t be relied on to have a predictable value.

Throws
Nothing.

STD::ATOMIC_INIT NONMEMBER FUNCTION
Nonatomically stores the supplied value in an instance of std::atomic<BaseType>.

Declaration
```cpp
template<typename BaseType>
void atomic_init(atomic<BaseType> volatile* p, BaseType v) noexcept;
template<typename BaseType>
void atomic_init(atomic<BaseType>* p, BaseType v) noexcept;
```

Effects
Nonatomically stores the value of v in *p. Invoking atomic_init() on an instance
of  atomic<BaseType>  that  hasn’t  been  default  constructed,  or  that  has  had  any
operations performed on it since construction, is undefined behavior.

NOTE Because  this  store  is  nonatomic,  any  concurrent  access  to  the  object
pointed  to  by  p  from  another  thread  (even  with  atomic  operations)  constitutes a data race.

Throws
Nothing.

<atomic> header

STD::ATOMIC CONVERSION CONSTRUCTOR
Constructs an instance of std::atomic with the supplied BaseType value.

Declaration
```cpp
constexpr atomic(BaseType b) noexcept;
```

Effects
Constructs a new std::atomic object with a value of b. For objects with static storage duration, this is static initialization.

Throws
Nothing.

STD::ATOMIC CONVERSION ASSIGNMENT OPERATOR
Stores a new value in *this.

Declaration
```cpp
BaseType operator=(BaseType b) volatile noexcept;
BaseType operator=(BaseType b) noexcept;
```

Effects
```cpp
return this->store(b);
```

STD::ATOMIC::IS_LOCK_FREE MEMBER FUNCTION
Determines if operations on *this are lock-free.

Declaration
```cpp
bool is_lock_free() const volatile noexcept;
bool is_lock_free() const noexcept;
```

Returns
true if operations on *this are lock-free, false otherwise.

Throws
Nothing.

STD::ATOMIC_IS_LOCK_FREE NONMEMBER FUNCTION
Determines if operations on *this are lock-free.

Declaration
```cpp
template<typename BaseType>
bool atomic_is_lock_free(volatile const atomic<BaseType>* p) noexcept;
template<typename BaseType>
bool atomic_is_lock_free(const atomic<BaseType>* p) noexcept;
```

Effects
```cpp
return p->is_lock_free();
```

STD::ATOMIC::IS_ALWAYS_LOCK_FREE STATIC DATA MEMBER
Determines if operations on all objects of this type are always lock-free.

Declaration
```cpp
static constexpr bool is_always_lock_free() = implementation-defined;
```

Value
true if operations on all objects of this type are always lock-free, false otherwise.

STD::ATOMIC::LOAD MEMBER FUNCTION
Atomically loads the current value of the std::atomic instance.

Declaration
BaseType load(memory_order order = memory_order_seq_cst)
```cpp
    const volatile noexcept;
BaseType load(memory_order order = memory_order_seq_cst) const noexcept;
```

Preconditions
The  supplied  order  must  be  one  of  std::memory_order_relaxed,  std::memory_
```cpp
order_acquire, std::memory_order_consume, or std::memory_order_seq_cst.
```

Effects
Atomically loads the value stored in *this.

Returns
The value stored in *this at the point of the call.

Throws
Nothing.

NOTE This is an atomic load operation for the memory location comprising
```cpp
*this.
```

STD::ATOMIC_LOAD NONMEMBER FUNCTION
Atomically loads the current value of the std::atomic instance.

Declaration
```cpp
template<typename BaseType>
BaseType atomic_load(volatile const atomic<BaseType>* p) noexcept;
template<typename BaseType>
BaseType atomic_load(const atomic<BaseType>* p) noexcept;
```

Effects
```cpp
return p->load();
```

STD::ATOMIC_LOAD_EXPLICIT NONMEMBER FUNCTION
Atomically loads the current value of the std::atomic instance.

Declaration
```cpp
template<typename BaseType>
BaseType atomic_load_explicit(
    volatile const atomic<BaseType>* p, memory_order order) noexcept;
template<typename BaseType>
BaseType atomic_load_explicit(
    const atomic<BaseType>* p, memory_order order) noexcept;
```

Effects
```cpp
return p->load(order);
```

STD::ATOMIC::OPERATOR BASETYPE CONVERSION OPERATOR
Loads the value stored in *this.

Declaration
```cpp
operator BaseType() const volatile noexcept;
operator BaseType() const noexcept;
```

<atomic> header

Effects
```cpp
return this->load();
```

STD::ATOMIC::STORE MEMBER FUNCTION
Atomically stores a new value in an atomic<BaseType> instance.

Declaration
```cpp
void store(BaseType new_value,memory_order order = memory_order_seq_cst)
```

    volatile noexcept;
```cpp
void store(BaseType new_value,memory_order order = memory_order_seq_cst)
```

    noexcept;

Preconditions
The  supplied  order  must  be  one  of  std::memory_order_relaxed,  std::memory_
```cpp
order_release, or std::memory_order_seq_cst.
```

Effects
Atomically stores new_value in *this.

Throws
Nothing.

NOTE This is an atomic store operation for the memory location comprising
```cpp
*this.
```

STD::ATOMIC_STORE NONMEMBER FUNCTION
Atomically stores a new value in an atomic<BaseType> instance.

Declaration
```cpp
template<typename BaseType>
void atomic_store(volatile atomic<BaseType>* p, BaseType new_value)
```

    noexcept;
```cpp
template<typename BaseType>
void atomic_store(atomic<BaseType>* p, BaseType new_value) noexcept;
```

Effects
```cpp
p->store(new_value);
```

STD::ATOMIC_STORE_EXPLICIT NONMEMBER FUNCTION
Atomically stores a new value in an atomic<BaseType> instance.

Declaration
```cpp
template<typename BaseType>
void atomic_store_explicit(
    volatile atomic<BaseType>* p, BaseType new_value, memory_order order)
```

    noexcept;
```cpp
template<typename BaseType>
void atomic_store_explicit(
    atomic<BaseType>* p, BaseType new_value, memory_order order) noexcept;
```

Effects
```cpp
p->store(new_value,order);
```

STD::ATOMIC::EXCHANGE MEMBER FUNCTION
Atomically stores a new value and reads the old one.

Declaration
BaseType exchange(
    BaseType new_value,
    memory_order order = memory_order_seq_cst)
    volatile noexcept;

Effects
Atomically stores new_value in *this and retrieves the existing value of *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_EXCHANGE NONMEMBER FUNCTION
Atomically stores a new value in an atomic<BaseType> instance and reads the prior
value.

Declaration
```cpp
template<typename BaseType>
BaseType atomic_exchange(volatile atomic<BaseType>* p, BaseType new_value)
```

    noexcept;
```cpp
template<typename BaseType>
BaseType atomic_exchange(atomic<BaseType>* p, BaseType new_value) noexcept;
```

Effects
```cpp
return p->exchange(new_value);
```

STD::ATOMIC_EXCHANGE_EXPLICIT NONMEMBER FUNCTION
Atomically stores a new value in an atomic<BaseType> instance and reads the prior
value.

Declaration
```cpp
template<typename BaseType>
BaseType atomic_exchange_explicit(
    volatile atomic<BaseType>* p, BaseType new_value, memory_order order)
```

    noexcept;
```cpp
template<typename BaseType>
BaseType atomic_exchange_explicit(
    atomic<BaseType>* p, BaseType new_value, memory_order order) noexcept;
```

Effects
```cpp
return p->exchange(new_value,order);
```

<atomic> header

STD::ATOMIC::COMPARE_EXCHANGE_STRONG MEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values
are equal. If the values aren’t equal, updates the expected value with the value read.

Declaration
```cpp
bool compare_exchange_strong(
    BaseType& expected,BaseType new_value,
    memory_order order = std::memory_order_seq_cst) volatile noexcept;
bool compare_exchange_strong(
    BaseType& expected,BaseType new_value,
    memory_order order = std::memory_order_seq_cst) noexcept;
bool compare_exchange_strong(
    BaseType& expected,BaseType new_value,
    memory_order success_order,memory_order failure_order)
```

    volatile noexcept;
```cpp
bool compare_exchange_strong(
    BaseType& expected,BaseType new_value,
    memory_order success_order,memory_order failure_order) noexcept;
```

Preconditions
failure_order  shall  not  be  std::memory_order_release  or  std::memory_order
_acq_rel.

Effects
Atomically compares expected to the value stored in *this using bitwise comparison  and  stores  new_value  in  *this  if  equal;  otherwise  updates  expected  to  the
value read.

Returns
true if the existing value of *this was equal to expected, false otherwise.

Throws
Nothing.

NOTE The  three-parameter  overload  is  equivalent  to  the  four-parameter
overload  with  success_order==order  and  failure_order==order,  except
that if order is std::memory_order_acq_rel, then failure_order is std::
memory_order_acquire, and if order is std::memory_order_release, then
```cpp
failure_order is std::memory_order_relaxed.
```

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this if the result is true, with memory ordering success_order;
otherwise, it’s an atomic load operation for the memory location comprising
```cpp
*this with memory ordering failure_order.
```

STD::ATOMIC_COMPARE_EXCHANGE_STRONG NONMEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values
are equal. If the values aren’t equal, updates the expected value with the value read.

Declaration
```cpp
template<typename BaseType>
bool atomic_compare_exchange_strong(

    volatile atomic<BaseType>* p,BaseType * old_value,BaseType new_value)
```

    noexcept;
```cpp
template<typename BaseType>
bool atomic_compare_exchange_strong(
    atomic<BaseType>* p,BaseType * old_value,BaseType new_value) noexcept;
```

Effects
```cpp
return p->compare_exchange_strong(*old_value,new_value);
```

STD::ATOMIC_COMPARE_EXCHANGE_STRONG_EXPLICIT NONMEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values
are equal. If the values aren’t equal, updates the expected value with the value read.

Declaration
```cpp
template<typename BaseType>
bool atomic_compare_exchange_strong_explicit(
    volatile atomic<BaseType>* p,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
template<typename BaseType>
bool atomic_compare_exchange_strong_explicit(
    atomic<BaseType>* p,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
```

Effects
```cpp
return p->compare_exchange_strong(
    *old_value,new_value,success_order,failure_order) noexcept;
```

STD::ATOMIC::COMPARE_EXCHANGE_WEAK MEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values are equal and the update can be done atomically. If the values aren’t equal or the
update can’t be done atomically, updates the expected value with the value read.

Declaration
```cpp
bool compare_exchange_weak(
    BaseType& expected,BaseType new_value,
    memory_order order = std::memory_order_seq_cst) volatile noexcept;
bool compare_exchange_weak(
    BaseType& expected,BaseType new_value,
    memory_order order = std::memory_order_seq_cst) noexcept;
bool compare_exchange_weak(
    BaseType& expected,BaseType new_value,
    memory_order success_order,memory_order failure_order)
```

    volatile noexcept;
```cpp
bool compare_exchange_weak(
    BaseType& expected,BaseType new_value,
    memory_order success_order,memory_order failure_order) noexcept;
```

Preconditions
failure_order  shall  not  be  std::memory_order_release  or  std::memory_order
_acq_rel.

<atomic> header

Effects
Atomically compares expected to the value stored in *this using bitwise comparison and stores new_value in *this if equal. If the values aren’t equal or the update
can’t be done atomically, updates expected to the value read.

Returns
true if the existing value of *this was equal to expected and new_value was successfully stored in *this, false otherwise.

Throws
Nothing.

NOTE The  three-parameter  overload  is  equivalent  to  the  four-parameter
overload  with  success_order==order  and  failure_order==order,  except
that if order is std::memory_order_acq_rel, then failure_order is std::
memory_order_acquire, and if order is std::memory_order_release, then
```cpp
failure_order is std::memory_order_relaxed.
```

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this if the result is true, with memory ordering success_order;
otherwise, it’s an atomic load operation for the memory location comprising
```cpp
*this with memory ordering failure_order.
```

STD::ATOMIC_COMPARE_EXCHANGE_WEAK NONMEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values are equal and the update can be done atomically. If the values aren’t equal or the
update can’t be done atomically, updates the expected value with the value read.

Declaration
```cpp
template<typename BaseType>
bool atomic_compare_exchange_weak(
    volatile atomic<BaseType>* p,BaseType * old_value,BaseType new_value)
```

    noexcept;
```cpp
template<typename BaseType>
bool atomic_compare_exchange_weak(
    atomic<BaseType>* p,BaseType * old_value,BaseType new_value) noexcept;
```

Effects
```cpp
return p->compare_exchange_weak(*old_value,new_value);
```

STD::ATOMIC_COMPARE_EXCHANGE_WEAK_EXPLICIT NONMEMBER FUNCTION
Atomically compares the value to an expected value and stores a new value if the values are equal and the update can be done atomically. If the values aren’t equal or the
update can’t be done atomically, updates the expected value with the value read.

Declaration
```cpp
template<typename BaseType>
bool atomic_compare_exchange_weak_explicit(
    volatile atomic<BaseType>* p,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
template<typename BaseType>

bool atomic_compare_exchange_weak_explicit(
    atomic<BaseType>* p,BaseType * old_value,
    BaseType new_value, memory_order success_order,
    memory_order failure_order) noexcept;
```

Effects
```cpp
return p->compare_exchange_weak(
    *old_value,new_value,success_order,failure_order);

D.3.9 Specializations of the std::atomic template
```

Specializations of the std::atomic class template are provided for the integral types
and  pointer  types.  For  the  integral  types,  these  specializations  provide  atomic  addition, subtraction, and bitwise operations in addition to the operations provided by the
primary template. For pointer types, the specializations provide atomic pointer arithmetic in addition to the operations provided by the primary template.

 Specializations are provided for the following integral types:

```cpp
std::atomic<bool>
std::atomic<char>
std::atomic<signed char>
std::atomic<unsigned char>
std::atomic<short>
std::atomic<unsigned short>
std::atomic<int>
std::atomic<unsigned>
std::atomic<long>
std::atomic<unsigned long>
std::atomic<long long>
std::atomic<unsigned long long>
std::atomic<wchar_t>
std::atomic<char16_t>
std::atomic<char32_t>

and std::atomic<T*> for all types T.

D.3.10 std::atomic<integral-type> specializations
```

The std::atomic<integral-type> specializations of the std::atomic class template
provide an atomic integral data type for each fundamental integer type, with a comprehensive set of operations.

  The  following  description  applies  to  these  specializations  of  the  std::atomic<>

```cpp
class template:

std::atomic<char>
std::atomic<signed char>
std::atomic<unsigned char>
std::atomic<short>
std::atomic<unsigned short>
std::atomic<int>
std::atomic<unsigned>
std::atomic<long>
```

<atomic> header

```cpp
std::atomic<unsigned long>
std::atomic<long long>
std::atomic<unsigned long long>
std::atomic<wchar_t>
std::atomic<char16_t>
std::atomic<char32_t>
```

Instances  of  these  specializations  are  not  CopyConstructible  or  CopyAssignable,
because these operations can’t be performed as a single atomic operation.

Class definition
```cpp
template<>
struct atomic<integral-type>
{
    atomic() noexcept = default;
    constexpr atomic(integral-type) noexcept;
    bool operator=(integral-type) volatile noexcept;

    atomic(const atomic&) = delete;
    atomic& operator=(const atomic&) = delete;
    atomic& operator=(const atomic&) volatile = delete;

    bool is_lock_free() const volatile noexcept;
    bool is_lock_free() const noexcept;

    void store(integral-type,memory_order = memory_order_seq_cst)
```

        volatile noexcept;
```cpp
    void store(integral-type,memory_order = memory_order_seq_cst) noexcept;
    integral-type load(memory_order = memory_order_seq_cst)
        const volatile noexcept;
    integral-type load(memory_order = memory_order_seq_cst) const noexcept;
    integral-type exchange(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type exchange(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;

    bool compare_exchange_strong(
        integral-type & old_value,integral-type new_value,
         memory_order order = memory_order_seq_cst) volatile noexcept;
    bool compare_exchange_strong(
        integral-type & old_value,integral-type new_value,
         memory_order order = memory_order_seq_cst) noexcept;
    bool compare_exchange_strong(
        integral-type & old_value,integral-type new_value,
        memory_order success_order,memory_order failure_order)
```

        volatile noexcept;
```cpp
    bool compare_exchange_strong(
        integral-type & old_value,integral-type new_value,
        memory_order success_order,memory_order failure_order) noexcept;
    bool compare_exchange_weak(
        integral-type & old_value,integral-type new_value,
         memory_order order = memory_order_seq_cst) volatile noexcept;
    bool compare_exchange_weak(
        integral-type & old_value,integral-type new_value,
         memory_order order = memory_order_seq_cst) noexcept;

    bool compare_exchange_weak(
        integral-type & old_value,integral-type new_value,
        memory_order success_order,memory_order failure_order)
```

        volatile noexcept;
```cpp
    bool compare_exchange_weak(
        integral-type & old_value,integral-type new_value,
        memory_order success_order,memory_order failure_order) noexcept;

    operator integral-type() const volatile noexcept;
    operator integral-type() const noexcept;

    integral-type fetch_add(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type fetch_add(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;
    integral-type fetch_sub(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type fetch_sub(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;
    integral-type fetch_and(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type fetch_and(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;
    integral-type fetch_or(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type fetch_or(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;
    integral-type fetch_xor(
```

        integral-type,memory_order = memory_order_seq_cst)
        volatile noexcept;
    integral-type fetch_xor(
```cpp
        integral-type,memory_order = memory_order_seq_cst) noexcept;

    integral-type operator++() volatile noexcept;
    integral-type operator++() noexcept;
    integral-type operator++(int) volatile noexcept;
    integral-type operator++(int) noexcept;
    integral-type operator--() volatile noexcept;
    integral-type operator--() noexcept;
    integral-type operator--(int) volatile noexcept;
    integral-type operator--(int) noexcept;

    integral-type operator+=(integral-type) volatile noexcept;
    integral-type operator+=(integral-type) noexcept;
    integral-type operator-=(integral-type) volatile noexcept;
    integral-type operator-=(integral-type) noexcept;
    integral-type operator&=(integral-type) volatile noexcept;
    integral-type operator&=(integral-type) noexcept;
    integral-type operator|=(integral-type) volatile noexcept;
    integral-type operator|=(integral-type) noexcept;
    integral-type operator^=(integral-type) volatile noexcept;
    integral-type operator^=(integral-type) noexcept;
```

};

<atomic> header

```cpp
bool atomic_is_lock_free(volatile const atomic<integral-type>*) noexcept;
bool atomic_is_lock_free(const atomic<integral-type>*) noexcept;
void atomic_init(volatile atomic<integral-type>*,integral-type) noexcept;
void atomic_init(atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_exchange(
    volatile atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_exchange(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_exchange_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_exchange_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
void atomic_store(volatile atomic<integral-type>*,integral-type) noexcept;
void atomic_store(atomic<integral-type>*,integral-type) noexcept;
void atomic_store_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
void atomic_store_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_load(volatile const atomic<integral-type>*) noexcept;
integral-type atomic_load(const atomic<integral-type>*) noexcept;
integral-type atomic_load_explicit(
    volatile const atomic<integral-type>*,memory_order) noexcept;
integral-type atomic_load_explicit(
    const atomic<integral-type>*,memory_order) noexcept;
bool atomic_compare_exchange_strong(
    volatile atomic<integral-type>*,
    integral-type * old_value,integral-type new_value) noexcept;
bool atomic_compare_exchange_strong(
    atomic<integral-type>*,
    integral-type * old_value,integral-type new_value) noexcept;
bool atomic_compare_exchange_strong_explicit(
    volatile atomic<integral-type>*,
    integral-type * old_value,integral-type new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_strong_explicit(
    atomic<integral-type>*,
    integral-type * old_value,integral-type new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_weak(
    volatile atomic<integral-type>*,
    integral-type * old_value,integral-type new_value) noexcept;
bool atomic_compare_exchange_weak(
    atomic<integral-type>*,
    integral-type * old_value,integral-type new_value) noexcept;
bool atomic_compare_exchange_weak_explicit(
    volatile atomic<integral-type>*,
    integral-type * old_value,integral-type new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_weak_explicit(
    atomic<integral-type>*,
    integral-type * old_value,integral-type new_value,
    memory_order success_order,memory_order failure_order) noexcept;

integral-type atomic_fetch_add(
    volatile atomic<integral-type>*,integral-type) noexcept;

integral-type atomic_fetch_add(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_add_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_add_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_sub(
    volatile atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_sub(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_sub_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_sub_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_and(
    volatile atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_and(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_and_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_and_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_or(
    volatile atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_or(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_or_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_or_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_xor(
    volatile atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_xor(
    atomic<integral-type>*,integral-type) noexcept;
integral-type atomic_fetch_xor_explicit(
    volatile atomic<integral-type>*,integral-type, memory_order) noexcept;
integral-type atomic_fetch_xor_explicit(
    atomic<integral-type>*,integral-type, memory_order) noexcept;
```

Those operations that are also provided by the primary template (see D.3.8) have
the same semantics.

STD::ATOMIC<INTEGRAL-TYPE>::FETCH_ADD MEMBER FUNCTION
Atomically loads a value and replaces it with the sum of that value and the supplied
value i.

Declaration
integral-type fetch_add(
    integral-type i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
integral-type fetch_add(
```cpp
    integral-type i,memory_order order = memory_order_seq_cst) noexcept;
```

<atomic> header

Effects
Atomically retrieves the existing value of *this and stores old-value + i in *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_ADD NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<integral-type>  instance  and  replaces  it
with that value plus the supplied value i.

Declaration
integral-type atomic_fetch_add(
```cpp
    volatile atomic<integral-type>* p, integral-type i) noexcept;
integral-type atomic_fetch_add(
    atomic<integral-type>* p, integral-type i) noexcept;
```

Effects
```cpp
return p->fetch_add(i);
```

STD::ATOMIC_FETCH_ADD_EXPLICIT NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<integral-type>  instance  and  replaces  it
with that value plus the supplied value i.

Declaration
integral-type atomic_fetch_add_explicit(
    volatile atomic<integral-type>* p, integral-type i,
```cpp
    memory_order order) noexcept;
integral-type atomic_fetch_add_explicit(
```

    atomic<integral-type>* p, integral-type i, memory_order order)
    noexcept;

Effects
```cpp
return p->fetch_add(i,order);
```

STD::ATOMIC<INTEGRAL-TYPE>::FETCH_SUB MEMBER FUNCTION
Atomically loads a value and replaces it with the sum of that value and the supplied
value i.

Declaration
integral-type fetch_sub(
    integral-type i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
integral-type fetch_sub(
```cpp
    integral-type i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value - i in *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_SUB NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with that value minus the supplied value i.

Declaration
integral-type atomic_fetch_sub(
```cpp
    volatile atomic<integral-type>* p, integral-type i) noexcept;
integral-type atomic_fetch_sub(
    atomic<integral-type>* p, integral-type i) noexcept;
```

Effects
```cpp
return p->fetch_sub(i);
```

STD::ATOMIC_FETCH_SUB_EXPLICIT NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with that value minus the supplied value i.

Declaration
integral-type atomic_fetch_sub_explicit(
    volatile atomic<integral-type>* p, integral-type i,
```cpp
    memory_order order) noexcept;
integral-type atomic_fetch_sub_explicit(
```

    atomic<integral-type>* p, integral-type i, memory_order order)
    noexcept;

Effects
```cpp
return p->fetch_sub(i,order);
```

STD::ATOMIC<INTEGRAL-TYPE>::FETCH_AND MEMBER FUNCTION
Atomically loads a value and replaces it with the bitwise-and of that value and the supplied value i.

Declaration
integral-type fetch_and(
    integral-type i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
integral-type fetch_and(
```cpp
    integral-type i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value & i in *this.

Returns
The value of *this immediately prior to the store.

<atomic> header

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_AND NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-and of that value and the supplied value i.

Declaration
integral-type atomic_fetch_and(
```cpp
    volatile atomic<integral-type>* p, integral-type i) noexcept;
integral-type atomic_fetch_and(
    atomic<integral-type>* p, integral-type i) noexcept;
```

Effects
```cpp
return p->fetch_and(i);
```

STD::ATOMIC_FETCH_AND_EXPLICIT NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-and of that value and the supplied value i.

Declaration
integral-type atomic_fetch_and_explicit(
    volatile atomic<integral-type>* p, integral-type i,
```cpp
    memory_order order) noexcept;
integral-type atomic_fetch_and_explicit(
```

    atomic<integral-type>* p, integral-type i, memory_order order)
    noexcept;

Effects
```cpp
return p->fetch_and(i,order);
```

STD::ATOMIC<INTEGRAL-TYPE>::FETCH_OR MEMBER FUNCTION
Atomically loads a value and replaces it with the bitwise-or of that value and the supplied value i.

Declaration
integral-type fetch_or(
    integral-type i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
integral-type fetch_or(
```cpp
    integral-type i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value | i in *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_OR NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-or of that value and the supplied value i.

Declaration
integral-type atomic_fetch_or(
```cpp
    volatile atomic<integral-type>* p, integral-type i) noexcept;
integral-type atomic_fetch_or(
    atomic<integral-type>* p, integral-type i) noexcept;
```

Effects
```cpp
return p->fetch_or(i);
```

STD::ATOMIC_FETCH_OR_EXPLICIT NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-or of that value and the supplied value i.

Declaration
integral-type atomic_fetch_or_explicit(
    volatile atomic<integral-type>* p, integral-type i,
```cpp
    memory_order order) noexcept;
integral-type atomic_fetch_or_explicit(
```

    atomic<integral-type>* p, integral-type i, memory_order order)
    noexcept;

Effects
```cpp
return p->fetch_or(i,order);
```

STD::ATOMIC<INTEGRAL-TYPE>::FETCH_XOR MEMBER FUNCTION
Atomically loads a value and replaces it with the bitwise-xor of that value and the supplied value i.

Declaration
integral-type fetch_xor(
    integral-type i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
integral-type fetch_xor(
```cpp
    integral-type i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value ^ i in *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

<atomic> header

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_XOR NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-xor of that value and the supplied value i.

Declaration
integral-type atomic_fetch_xor(
```cpp
    volatile atomic<integral-type>* p, integral-type i) noexcept;
integral-type atomic_fetch_xor(
    atomic<integral-type>* p, integral-type i) noexcept;
```

Effects
```cpp
return p->fetch_xor(i);
```

STD::ATOMIC_FETCH_XOR_EXPLICIT NONMEMBER FUNCTION
Atomically reads the value from an atomic<integral-type> instance and replaces it
with the bitwise-xor of that value and the supplied value i.

Declaration
integral-type atomic_fetch_xor_explicit(
    volatile atomic<integral-type>* p, integral-type i,
```cpp
    memory_order order) noexcept;
integral-type atomic_fetch_xor_explicit(
```

    atomic<integral-type>* p, integral-type i, memory_order order)
    noexcept;

Effects
```cpp
return p->fetch_xor(i,order);
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR++ PREINCREMENT OPERATOR
Atomically increments the value stored in *this and returns the new value.

Declaration
```cpp
integral-type operator++() volatile noexcept;
integral-type operator++() noexcept;
```

Effects
```cpp
return this->fetch_add(1) + 1;
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR++ POSTINCREMENT OPERATOR
Atomically increments the value stored in *this and returns the old value.

Declaration
```cpp
integral-type operator++(int) volatile noexcept;
integral-type operator++(int) noexcept;
```

Effects
```cpp
return this->fetch_add(1);
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR-- PREDECREMENT OPERATOR
Atomically decrements the value stored in *this and returns the new value.

Declaration
```cpp
integral-type operator--() volatile noexcept;
integral-type operator--() noexcept;
```

Effects
```cpp
return this->fetch_sub(1) – 1;
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR-- POSTDECREMENT OPERATOR
Atomically decrements the value stored in *this and returns the old value.

Declaration
```cpp
integral-type operator--(int) volatile noexcept;
integral-type operator--(int) noexcept;
```

Effects
```cpp
return this->fetch_sub(1);
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR+= COMPOUND ASSIGNMENT OPERATOR
Atomically adds the supplied value to the value stored in *this and returns the new
value.

Declaration
```cpp
integral-type operator+=(integral-type i) volatile noexcept;
integral-type operator+=(integral-type i) noexcept;
```

Effects
```cpp
return this->fetch_add(i) + i;
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR-= COMPOUND ASSIGNMENT OPERATOR
Atomically subtracts the supplied value from the value stored in *this and returns the
new value.

Declaration
```cpp
integral-type operator-=(integral-type i) volatile noexcept;
integral-type operator-=(integral-type i) noexcept;
```

Effects
```cpp
return this->fetch_sub(i,std::memory_order_seq_cst) – i;
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR&= COMPOUND ASSIGNMENT OPERATOR
Atomically  replaces  the  value  stored  in  *this  with  the  bitwise-and  of  the  supplied
value and the value stored in *this and returns the new value.

Declaration
```cpp
integral-type operator&=(integral-type i) volatile noexcept;
integral-type operator&=(integral-type i) noexcept;
```

Effects
```cpp
return this->fetch_and(i) & i;
```

<atomic> header

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR|= COMPOUND ASSIGNMENT OPERATOR
Atomically replaces the value stored in *this with the bitwise-or of the supplied value
and the value stored in *this and returns the new value.

Declaration
```cpp
integral-type operator|=(integral-type i) volatile noexcept;
integral-type operator|=(integral-type i) noexcept;
```

Effects
```cpp
return this->fetch_or(i,std::memory_order_seq_cst) | i;
```

STD::ATOMIC<INTEGRAL-TYPE>::OPERATOR^= COMPOUND ASSIGNMENT OPERATOR
Atomically  replaces  the  value  stored  in  *this  with  the  bitwise-xor  of  the  supplied
value and the value stored in *this and returns the new value.

Declaration
```cpp
integral-type operator^=(integral-type i) volatile noexcept;
integral-type operator^=(integral-type i) noexcept;
```

Effects
```cpp
return this->fetch_xor(i,std::memory_order_seq_cst) ^ i;
```

STD::ATOMIC<T*> PARTIAL SPECIALIZATION
The std::atomic<T*> partial specialization of the std::atomic class template provides
an atomic data type for each pointer type, with a comprehensive set of operations.

  Instances  of  std::atomic<T*>  are  not  CopyConstructible  or  CopyAssignable,

because these operations can’t be performed as a single atomic operation.

Class definition
```cpp
template<typename T>
struct atomic<T*>
{
    atomic() noexcept = default;
    constexpr atomic(T*) noexcept;
    bool operator=(T*) volatile;
    bool operator=(T*);

    atomic(const atomic&) = delete;
    atomic& operator=(const atomic&) = delete;
    atomic& operator=(const atomic&) volatile = delete;

    bool is_lock_free() const volatile noexcept;
    bool is_lock_free() const noexcept;
    void store(T*,memory_order = memory_order_seq_cst) volatile noexcept;
    void store(T*,memory_order = memory_order_seq_cst) noexcept;
    T* load(memory_order = memory_order_seq_cst) const volatile noexcept;
    T* load(memory_order = memory_order_seq_cst) const noexcept;
    T* exchange(T*,memory_order = memory_order_seq_cst) volatile noexcept;
    T* exchange(T*,memory_order = memory_order_seq_cst) noexcept;

    bool compare_exchange_strong(
        T* & old_value, T* new_value,
        memory_order order = memory_order_seq_cst) volatile noexcept;

    bool compare_exchange_strong(
        T* & old_value, T* new_value,
        memory_order order = memory_order_seq_cst) noexcept;
    bool compare_exchange_strong(
        T* & old_value, T* new_value,
        memory_order success_order,memory_order failure_order)
```

        volatile noexcept;
```cpp
    bool compare_exchange_strong(
        T* & old_value, T* new_value,
        memory_order success_order,memory_order failure_order) noexcept;
    bool compare_exchange_weak(
        T* & old_value, T* new_value,
        memory_order order = memory_order_seq_cst) volatile noexcept;
    bool compare_exchange_weak(
        T* & old_value, T* new_value,
        memory_order order = memory_order_seq_cst) noexcept;
    bool compare_exchange_weak(
        T* & old_value, T* new_value,
        memory_order success_order,memory_order failure_order)
```

        volatile noexcept;
```cpp
    bool compare_exchange_weak(
        T* & old_value, T* new_value,
        memory_order success_order,memory_order failure_order) noexcept;

    operator T*() const volatile noexcept;
    operator T*() const noexcept;

    T* fetch_add(
        ptrdiff_t,memory_order = memory_order_seq_cst) volatile noexcept;
    T* fetch_add(
        ptrdiff_t,memory_order = memory_order_seq_cst) noexcept;
    T* fetch_sub(
        ptrdiff_t,memory_order = memory_order_seq_cst) volatile noexcept;
    T* fetch_sub(
        ptrdiff_t,memory_order = memory_order_seq_cst) noexcept;

    T* operator++() volatile noexcept;
    T* operator++() noexcept;
    T* operator++(int) volatile noexcept;
    T* operator++(int) noexcept;
    T* operator--() volatile noexcept;
    T* operator--() noexcept;
    T* operator--(int) volatile noexcept;
    T* operator--(int) noexcept;

    T* operator+=(ptrdiff_t) volatile noexcept;
    T* operator+=(ptrdiff_t) noexcept;
    T* operator-=(ptrdiff_t) volatile noexcept;
    T* operator-=(ptrdiff_t) noexcept;
```

};

```cpp
bool atomic_is_lock_free(volatile const atomic<T*>*) noexcept;
bool atomic_is_lock_free(const atomic<T*>*) noexcept;
void atomic_init(volatile atomic<T*>*, T*) noexcept;
void atomic_init(atomic<T*>*, T*) noexcept;
T* atomic_exchange(volatile atomic<T*>*, T*) noexcept;
T* atomic_exchange(atomic<T*>*, T*) noexcept;
```

<atomic> header

T* atomic_exchange_explicit(volatile atomic<T*>*, T*, memory_order)
    noexcept;
```cpp
T* atomic_exchange_explicit(atomic<T*>*, T*, memory_order) noexcept;
void atomic_store(volatile atomic<T*>*, T*) noexcept;
void atomic_store(atomic<T*>*, T*) noexcept;
void atomic_store_explicit(volatile atomic<T*>*, T*, memory_order)
```

    noexcept;
```cpp
void atomic_store_explicit(atomic<T*>*, T*, memory_order) noexcept;
T* atomic_load(volatile const atomic<T*>*) noexcept;
T* atomic_load(const atomic<T*>*) noexcept;
T* atomic_load_explicit(volatile const atomic<T*>*, memory_order) noexcept;
T* atomic_load_explicit(const atomic<T*>*, memory_order) noexcept;
bool atomic_compare_exchange_strong(
    volatile atomic<T*>*,T* * old_value,T* new_value) noexcept;
bool atomic_compare_exchange_strong(
    volatile atomic<T*>*,T* * old_value,T* new_value) noexcept;
bool atomic_compare_exchange_strong_explicit(
    atomic<T*>*,T* * old_value,T* new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_strong_explicit(
    atomic<T*>*,T* * old_value,T* new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_weak(
    volatile atomic<T*>*,T* * old_value,T* new_value) noexcept;
bool atomic_compare_exchange_weak(
    atomic<T*>*,T* * old_value,T* new_value) noexcept;
bool atomic_compare_exchange_weak_explicit(
    volatile atomic<T*>*,T* * old_value, T* new_value,
    memory_order success_order,memory_order failure_order) noexcept;
bool atomic_compare_exchange_weak_explicit(
    atomic<T*>*,T* * old_value, T* new_value,
    memory_order success_order,memory_order failure_order) noexcept;

T* atomic_fetch_add(volatile atomic<T*>*, ptrdiff_t) noexcept;
T* atomic_fetch_add(atomic<T*>*, ptrdiff_t) noexcept;
T* atomic_fetch_add_explicit(
    volatile atomic<T*>*, ptrdiff_t, memory_order) noexcept;
T* atomic_fetch_add_explicit(
    atomic<T*>*, ptrdiff_t, memory_order) noexcept;
T* atomic_fetch_sub(volatile atomic<T*>*, ptrdiff_t) noexcept;
T* atomic_fetch_sub(atomic<T*>*, ptrdiff_t) noexcept;
T* atomic_fetch_sub_explicit(
    volatile atomic<T*>*, ptrdiff_t, memory_order) noexcept;
T* atomic_fetch_sub_explicit(
    atomic<T*>*, ptrdiff_t, memory_order) noexcept;
```

Those operations that are also provided by the primary template (see 11.3.8) have
the same semantics.

STD::ATOMIC<T*>::FETCH_ADD MEMBER FUNCTION
Atomically loads a value and replaces it with the sum of that value and the supplied
value i using standard pointer arithmetic rules, and returns the old value.

Declaration
T* fetch_add(

    ptrdiff_t i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
T* fetch_add(
```cpp
    ptrdiff_t i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value + i in *this.

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_ADD NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<T*>  instance  and  replaces  it  with  that
value plus the supplied value i using standard pointer arithmetic rules.

Declaration
```cpp
T* atomic_fetch_add(volatile atomic<T*>* p, ptrdiff_t i) noexcept;
T* atomic_fetch_add(atomic<T*>* p, ptrdiff_t i) noexcept;
```

Effects
```cpp
return p->fetch_add(i);
```

STD::ATOMIC_FETCH_ADD_EXPLICIT NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<T*>  instance  and  replaces  it  with  that
value plus the supplied value i using standard pointer arithmetic rules.

Declaration
T* atomic_fetch_add_explicit(
```cpp
    volatile atomic<T*>* p, ptrdiff_t i,memory_order order) noexcept;
T* atomic_fetch_add_explicit(
    atomic<T*>* p, ptrdiff_t i, memory_order order) noexcept;
```

Effects
```cpp
return p->fetch_add(i,order);
```

STD::ATOMIC<T*>::FETCH_SUB MEMBER FUNCTION
Atomically  loads  a  value  and  replaces  it  with  that  value  minus  the  supplied  value  i
using standard pointer arithmetic rules, and returns the old value.

Declaration
T* fetch_sub(
    ptrdiff_t i,memory_order order = memory_order_seq_cst)
    volatile noexcept;
T* fetch_sub(
```cpp
    ptrdiff_t i,memory_order order = memory_order_seq_cst) noexcept;
```

Effects
Atomically retrieves the existing value of *this and stores old-value - i in *this.

<atomic> header

Returns
The value of *this immediately prior to the store.

Throws
Nothing.

NOTE This is an atomic read-modify-write operation for the memory location
comprising *this.

STD::ATOMIC_FETCH_SUB NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<T*>  instance  and  replaces  it  with  that
value minus the supplied value i using standard pointer arithmetic rules.

Declaration
```cpp
T* atomic_fetch_sub(volatile atomic<T*>* p, ptrdiff_t i) noexcept;
T* atomic_fetch_sub(atomic<T*>* p, ptrdiff_t i) noexcept;
```

Effects
```cpp
return p->fetch_sub(i);
```

STD::ATOMIC_FETCH_SUB_EXPLICIT NONMEMBER FUNCTION
Atomically  reads  the  value  from  an  atomic<T*>  instance  and  replaces  it  with  that
value minus the supplied value i using standard pointer arithmetic rules.

Declaration
T* atomic_fetch_sub_explicit(
```cpp
    volatile atomic<T*>* p, ptrdiff_t i,memory_order order) noexcept;
T* atomic_fetch_sub_explicit(
    atomic<T*>* p, ptrdiff_t i, memory_order order) noexcept;
```

Effects
```cpp
return p->fetch_sub(i,order);
```

STD::ATOMIC<T*>::OPERATOR++ PREINCREMENT OPERATOR
Atomically  increments  the  value  stored  in  *this  using  standard  pointer  arithmetic
rules and returns the new value.

Declaration
```cpp
T* operator++() volatile noexcept;
T* operator++() noexcept;
```

Effects
```cpp
return this->fetch_add(1) + 1;
```

STD::ATOMIC<T*>::OPERATOR++ POSTINCREMENT OPERATOR
Atomically increments the value stored in *this and returns the old value.

Declaration
```cpp
T* operator++(int) volatile noexcept;
T* operator++(int) noexcept;
```

Effects
```cpp
return this->fetch_add(1);
```

STD::ATOMIC<T*>::OPERATOR-- PREDECREMENT OPERATOR
Atomically  decrements  the  value  stored  in  *this  using  standard  pointer  arithmetic
rules and returns the new value.

Declaration
```cpp
T* operator--() volatile noexcept;
T* operator--() noexcept;
```

Effects
```cpp
return this->fetch_sub(1) - 1;
```

STD::ATOMIC<T*>::OPERATOR-- POSTDECREMENT OPERATOR
Atomically  decrements  the  value  stored  in  *this  using  standard  pointer  arithmetic
rules and returns the old value.

Declaration
```cpp
T* operator--(int) volatile noexcept;
T* operator--(int) noexcept;
```

Effects
```cpp
return this->fetch_sub(1);
```

STD::ATOMIC<T*>::OPERATOR+= COMPOUND ASSIGNMENT OPERATOR
Atomically adds the supplied value to the value stored in *this using standard pointer
arithmetic rules and returns the new value.

Declaration
```cpp
T* operator+=(ptrdiff_t i) volatile noexcept;
T* operator+=(ptrdiff_t i) noexcept;
```

Effects
```cpp
return this->fetch_add(i) + i;
```

STD::ATOMIC<T*>::OPERATOR-= COMPOUND ASSIGNMENT OPERATOR
Atomically subtracts the supplied value from the value stored in *this using standard
pointer arithmetic rules and returns the new value.

Declaration
```cpp
T* operator-=(ptrdiff_t i) volatile noexcept;
T* operator-=(ptrdiff_t i) noexcept;
```

Effects
```cpp
return this->fetch_sub(i) - i;
```

D.4

<future> header
The <future> header provides facilities for handling asynchronous results from operations that may be performed on another thread.

Header contents
```cpp
namespace std
{
    enum class future_status {
```

        ready, timeout, deferred };

<future> header

```cpp
    enum class future_errc
    {

        broken_promise,
        future_already_retrieved,
        promise_already_satisfied,
```

        no_state
    };

```cpp
    class future_error;

    const error_category& future_category();
    error_code make_error_code(future_errc e);
    error_condition make_error_condition(future_errc e);

    template<typename ResultType>
    class future;

    template<typename ResultType>
    class shared_future;

    template<typename ResultType>
    class promise;

    template<typename FunctionSignature>
    class packaged_task; // no definition provided

    template<typename ResultType,typename ... Args>
    class packaged_task<ResultType (Args...)>;

    enum class launch {
```

        async, deferred
    };

```cpp
    template<typename FunctionType,typename ... Args>
```

    future<result_of<FunctionType(Args...)>::type>
```cpp
    async(FunctionType&& func,Args&& ... args);

    template<typename FunctionType,typename ... Args>
```

    future<result_of<FunctionType(Args...)>::type>
```cpp
    async(std::launch policy,FunctionType&& func,Args&& ... args);

}

D.4.1 std::future class template
```

The  std::future  class  template  provides  a  means  of  waiting  for  an  asynchronous
result from another thread, in conjunction with the std::promise and std:: pack-
aged_task class templates and the std::async function template, which can be used
to provide that asynchronous result. Only one std::future instance references any
given asynchronous result at any time.

  Instances  of  std::future  are  MoveConstructible  and  MoveAssignable  but  not

CopyConstructible or CopyAssignable.

Class definition
```cpp
template<typename ResultType>
class future
{
```

public:
```cpp
    future() noexcept;
    future(future&&) noexcept;
    future& operator=(future&&) noexcept;
    ~future();

    future(future const&) = delete;
    future& operator=(future const&) = delete;

    shared_future<ResultType> share();

    bool valid() const noexcept;

    see description get();

    void wait();

    template<typename Rep,typename Period>
    future_status wait_for(
        std::chrono::duration<Rep,Period> const& relative_time);

    template<typename Clock,typename Duration>
    future_status wait_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);
```

};

STD::FUTURE DEFAULT CONSTRUCTOR
```cpp
Constructs an std::future object without an associated asynchronous result.
```

Declaration
```cpp
future() noexcept;
```

Effects
```cpp
Constructs a new std::future instance.
```

Postconditions
valid() returns false.

Throws
Nothing.

STD::FUTURE MOVE CONSTRUCTOR
Constructs one std::future object from another, transferring ownership of the asynchronous  result  associated  with  the  other  std::future  object  to  the  newly  constructed instance.

Declaration
```cpp
future(future&& other) noexcept;
```

Effects
```cpp
Move-constructs a new std::future instance from other.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the constructor is associated with the newly constructed  std::future object. other has
no  associated  asynchronous  result.  this->valid()  returns  the  same  value  that
other.valid()  returned  before  the  invocation  of  this  constructor.  other
.valid() returns false.

<future> header

Throws
Nothing.

STD::FUTURE MOVE ASSIGNMENT OPERATOR
Transfers ownership of the asynchronous result associated with the one std::future
object to another.

Declaration
```cpp
future(future&& other) noexcept;
```

Effects
```cpp
Transfers ownership of an asynchronous state between std::future instances.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the constructor is associated with *this. other has no associated asynchronous result. The
ownership of the asynchronous state (if any) associated with *this prior to the call
is  released,  and  the  state  destroyed  if  this  is  the  last  reference.  this->valid()
returns the same value that other.valid() returned before the invocation of this
constructor. other.valid() returns false.

Throws
Nothing.

STD::FUTURE DESTRUCTOR
```cpp
Destroys an std::future object.
```

Declaration
```cpp
~future();
```

Effects
Destroys  *this.  If  this  is  the  last  reference  to  the  asynchronous  result  associated
with *this (if any), then destroy that asynchronous result.

Throws
Nothing.

STD::FUTURE::SHARE MEMBER FUNCTION
Constructs a new std::shared_future instance and transfers ownership of the asynchronous result associated with *this to this newly constructed std::shared_future
instance.

Declaration
```cpp
shared_future<ResultType> share();
```

Effects
As-if shared_future<ResultType>(std::move(*this)).

Postconditions
The asynchronous result associated with *this prior to the invocation of share()
(if  any)  is  associated  with  the  newly  constructed  std::shared_future  instance.
this->valid() returns false.

Throws
Nothing.

STD::FUTURE::VALID MEMBER FUNCTION
Checks if an std::future instance is associated with an asynchronous result.

Declaration
```cpp
bool valid() const noexcept;
```

Returns
true if *this has an associated asynchronous result, false otherwise.

Throws
Nothing.

STD::FUTURE::WAIT MEMBER FUNCTION
If the state associated with *this contains a deferred function, invokes the deferred
function. Otherwise, waits until the asynchronous result associated with an instance of
```cpp
std::future is ready.
```

Declaration
```cpp
void wait();
```

Preconditions
this->valid() would return true.

Effects
If the associated state contains a deferred function, invokes the deferred function
and stores the returned value or thrown exception as the asynchronous result. Otherwise, blocks until the asynchronous result associated with *this is ready.

Throws
Nothing.

STD::FUTURE::WAIT_FOR MEMBER FUNCTION
Waits  until  the  asynchronous  result  associated  with  an  instance  of  std::future  is
ready or until a specified time period has elapsed.

Declaration
```cpp
template<typename Rep,typename Period>
future_status wait_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
this->valid() would return true.

Effects
If the asynchronous result associated with *this contains a deferred function arising
from a call to std::async that hasn’t yet started execution, returns immediately without blocking. Otherwise blocks until the asynchronous result associated with *this is
ready or the time period specified by relative_time has elapsed.

Returns
std::future_status::deferred if the asynchronous result associated with *this
contains  a  deferred  function  arising  from  a  call  to  std::async  that  hasn’t  yet

<future> header

started execution,  std::future_status::ready if the asynchronous result associated with *this is ready, std::future_status::timeout if the time period specified by relative_time has elapsed.

NOTE The  thread  may  be  blocked  for  longer  than  the  specified  duration.
Where possible, the elapsed time is determined by a steady clock.

Throws
Nothing.

STD::FUTURE::WAIT_UNTIL MEMBER FUNCTION
Waits  until  the  asynchronous  result  associated  with  an  instance  of  std::future  is
ready or until a specified time period has elapsed.

Declaration
```cpp
template<typename Clock,typename Duration>
future_status wait_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
this->valid() would return true.

Effects
If the asynchronous result associated with *this contains a deferred function arising from a call to std::async that hasn’t yet started execution, returns immediately
without  blocking.  Otherwise  blocks  until  the  asynchronous  result  associated  with
```cpp
*this  is  ready  or  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_
```

time.

Returns
std::future_status::deferred if the asynchronous result associated with *this
contains  a  deferred  function  arising  from  a  call  to  std::async  that  hasn’t  yet
started execution,  std::future_status::ready if the asynchronous result associated with *this is ready, std::future_status::timeout if Clock::now() returns a
time equal to or later than absolute_time.

NOTE There’s  no  guarantee  as  to  how  long  the  calling  thread  will  be
blocked,  only  that  if  the  function  returns  std::future_status::timeout,
then  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at
the point at which the thread became unblocked.

Throws
Nothing.

STD::FUTURE::GET MEMBER FUNCTION
If the associated state contains a deferred function from a call to std::async, invokes
that  function  and  returns  the  result;  otherwise,  waits  until  the  asynchronous  result
associated with an instance of std::future is ready, and then returns the stored value
or throws the stored exception.

Declaration
```cpp
void future<void>::get();
R& future<R&>::get();
R future<R>::get();
```

Preconditions
this->valid() would return true.

Effects
If the state associated with *this contains a deferred function, invokes the deferred
function and returns the result or propagates any thrown exception.

Otherwise, blocks until the asynchronous result associated with *this is ready.
If  the  result  is  a  stored  exception,  throws  that  exception.  Otherwise,  returns  the
stored value.

Returns
If the associated state contains a deferred function, the result of the function invocation is returned. Otherwise, if  ResultType is  void, the call returns normally. If
ResultType is R& for some type R, the stored reference is returned. Otherwise, the
stored value is returned.

Throws
The  exception  thrown  by  the  deferred  exception  or  stored  in  the  asynchronous
result, if any.

Postcondition
this->valid()==false

```cpp
D.4.2 std::shared_future class template
```

The std::shared_future class template provides a means of waiting for an asynchronous  result  from  another  thread,  in  conjunction  with  the  std::promise  and  std::
packaged_task class templates and the std::async function template, which can be
used to provide that asynchronous result. Multiple std::shared_future instances can
reference the same asynchronous result.

  Instances  of  std::shared_future  are  CopyConstructible  and  CopyAssignable.
You  can  also  move-construct  a  std::shared_future  from  a  std::future  with  the
same ResultType.

  Accesses  to  a  given  instance  of  std::shared_future  aren’t  synchronized.  It’s
therefore  not  safe  for  multiple  threads  to  access  the  same  std::shared_future
instance without external synchronization. But accesses to the associated state are synchronized, so it is safe for multiple threads to each access separate instances of std::
shared_future that share the same associated state without external synchronization.

Class definition
```cpp
template<typename ResultType>
class shared_future
{
```

public:
```cpp
    shared_future() noexcept;
    shared_future(future<ResultType>&&) noexcept;
```

<future> header

```cpp
    shared_future(shared_future&&) noexcept;
    shared_future(shared_future const&);
    shared_future& operator=(shared_future const&);
    shared_future& operator=(shared_future&&) noexcept;
    ~shared_future();

    bool valid() const noexcept;

    see description get() const;

    void wait() const;

    template<typename Rep,typename Period>
    future_status wait_for(
        std::chrono::duration<Rep,Period> const& relative_time) const;

    template<typename Clock,typename Duration>
    future_status wait_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time) const;
```

};

STD::SHARED_FUTURE DEFAULT CONSTRUCTOR
```cpp
Constructs an std::shared_future object without an associated asynchronous result.
```

Declaration
```cpp
shared_future() noexcept;
```

Effects
```cpp
Constructs a new std::shared_future instance.
```

Postconditions
valid() returns false for the newly constructed instance.

Throws
Nothing.

STD::SHARED_FUTURE MOVE CONSTRUCTOR
```cpp
Constructs one std::shared_future object from another, transferring ownership of
```

the asynchronous result associated with the other std::shared_future object to the
newly constructed instance.

Declaration
```cpp
shared_future(shared_future&& other) noexcept;
```

Effects
```cpp
Constructs a new std::shared_future instance.
```

Postconditions
The  asynchronous  result  associated  with  other  prior  to  the  invocation  of  the  constructor is associated with the newly constructed std::shared_future object. other
has no associated asynchronous result.

Throws
Nothing.

STD::SHARED_FUTURE MOVE-FROM-STD::FUTURE CONSTRUCTOR
Constructs  an  std::shared_future  object  from  astd::future,  transferring  ownership of the asynchronous result associated with the std::future object to the newly
```cpp
constructed std::shared_future.
```

Declaration
```cpp
shared_future(std::future<ResultType>&& other) noexcept;
```

Effects
```cpp
Constructs a new std::shared_future instance.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the constructor is associated with the newly constructed std::shared_future object. other
has no associated asynchronous result.

Throws
Nothing.

STD::SHARED_FUTURE COPY CONSTRUCTOR
Constructs one std::shared_future object from another, so that both the source and
the  copy  refer  to  the  asynchronous  result  associated  with  the  source  std::shared_
future object, if any.

Declaration
```cpp
shared_future(shared_future const& other);
```

Effects
```cpp
Constructs a new std::shared_future instance.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the constructor is associated with the newly constructed  std::shared_future object and
other.

Throws
Nothing.

STD::SHARED_FUTURE DESTRUCTOR
```cpp
Destroys an std::shared_future object.
```

Declaration
```cpp
~shared_future();
```

Effects
Destroys  *this.  If  there’s  no  longer  an  std::promise  or  std::packaged_task
instance associated with the asynchronous result associated with *this, and this is
the  last  std::shared_future  instance  associated  with  that  asynchronous  result,
destroys that asynchronous result.

Throws
Nothing.

<future> header

STD::SHARED_FUTURE::VALID MEMBER FUNCTION
Checks if an std::shared_future instance is associated with an asynchronous result.

Declaration
```cpp
bool valid() const noexcept;
```

Returns
true if *this has an associated asynchronous result, false otherwise.

Throws
Nothing.

STD::SHARED_FUTURE::WAIT MEMBER FUNCTION
If the state associated with *this contains a deferred function, invokes the deferred
function. Otherwise, waits until the asynchronous result associated with an instance of
```cpp
std::shared_future is ready.
```

Declaration
```cpp
void wait() const;
```

Preconditions
this->valid() would return true.

Effects
Calls to get() and wait() from multiple threads on std::shared_future instances
that share the same associated state are serialized. If the associated state contains a
deferred function, the first call to get() or wait() invokes the deferred function
and stores the returned value or thrown exception as the asynchronous result.

Blocks until the asynchronous result associated with *this is ready.

Throws
Nothing.

STD::SHARED_FUTURE::WAIT_FOR MEMBER FUNCTION
Waits  until  the  asynchronous  result  associated  with  an  instance  of  std::shared_
future is ready or until a specified time period has elapsed.

Declaration
```cpp
template<typename Rep,typename Period>
future_status wait_for(
    std::chrono::duration<Rep,Period> const& relative_time) const;
```

Preconditions
this->valid() would return true.

Effects
If the asynchronous result associated with *this contains a deferred function arising from a call to std::async that has not yet started execution, returns immediately without blocking. Otherwise, blocks until the asynchronous result associated
with *this is ready or the time period specified by relative_time has elapsed.

Returns
std::future_status::deferred if the asynchronous result associated with *this
contains  a  deferred  function  arising  from  a  call  to  std::async  that  hasn’t  yet

started execution,  std::future_status::ready if the asynchronous result associated with *this is ready, std::future_status::timeout if the time period specified by relative_time has elapsed.

NOTE The  thread  may  be  blocked  for  longer  than  the  specified  duration.
Where possible, the elapsed time is determined by a steady clock.

Throws
Nothing.

STD::SHARED_FUTURE::WAIT_UNTIL MEMBER FUNCTION
Waits  until  the  asynchronous  result  associated  with  an  instance  of  std::shared_
future is ready or until a specified time period has elapsed.

Declaration
```cpp
template<typename Clock,typename Duration>
bool wait_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time) const;
```

Preconditions
this->valid() would return true.

Effects
If the asynchronous result associated with *this contains a deferred function arising from a call to std::async that hasn’t yet started execution, returns immediately
without blocking. Otherwise, blocks until the asynchronous result associated with
```cpp
*this  is  ready  or  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_
```

time.

Returns
std::future_status::deferred if the asynchronous result associated with *this
contains  a  deferred  function  arising  from  a  call  to  std::async  that  hasn’t  yet
started execution,  std::future_status::ready if the asynchronous result associated with *this is ready, std::future_status::timeout if Clock::now() returns a
time equal to or later than absolute_time.

NOTE There’s  no  guarantee  as  to  how  long  the  calling  thread  will  be
blocked,  only  that  if  the  function  returns  std::future_status::timeout,
then  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at
the point at which the thread became unblocked.

Throws
Nothing.

STD::SHARED_FUTURE::GET MEMBER FUNCTION
If the associated state contains a deferred function from a call to std::async, invokes
that  function  and  return  the  result.  Otherwise,  waits  until  the  asynchronous  result
associated  with  an  instance  of  std::shared_future  is  ready,  and  then  returns  the
stored value or throws the stored exception.

<future> header

Declaration
```cpp
void shared_future<void>::get() const;
R& shared_future<R&>::get() const;
R const& shared_future<R>::get() const;
```

Preconditions
this->valid() would return true.

Effects
Calls to get() and wait() from multiple threads on std::shared_future instances
that share the same associated state are serialized. If the associated state contains a
deferred function, the first call to get() or wait() invokes the deferred function
and stores the returned value or thrown exception as the asynchronous result.

Blocks until the asynchronous result associated with *this is ready. If the asynchronous result is a stored exception, throws that exception. Otherwise, returns the
stored value.

Returns
If ResultType is void, returns normally. If ResultType is R& for some type R, returns
the stored reference. Otherwise, returns a const reference to the stored value.

Throws
The stored exception, if any.

```cpp
D.4.3 std::packaged_task class template
```

The std::packaged_task class template packages a function or other callable object
so that when the function is invoked through the std::packaged_task instance, the
result  is  stored  as  an  asynchronous  result  for  retrieval  through  an  instance  of
```cpp
std::future.
```

  Instances  of  std::packaged_task  are  MoveConstructible  and  MoveAssignable

but not CopyConstructible or CopyAssignable.

Class definition
```cpp
template<typename FunctionType>
class packaged_task; // undefined

template<typename ResultType,typename... ArgTypes>
class packaged_task<ResultType(ArgTypes...)>
{
```

public:

```cpp
    packaged_task() noexcept;
    packaged_task(packaged_task&&) noexcept;
    ~packaged_task();

    packaged_task& operator=(packaged_task&&) noexcept;

    packaged_task(packaged_task const&) = delete;
    packaged_task& operator=(packaged_task const&) = delete;

    void swap(packaged_task&) noexcept;

    template<typename Callable>
    explicit packaged_task(Callable&& func);

    template<typename Callable,typename Allocator>
    packaged_task(std::allocator_arg_t, const Allocator&,Callable&&);

    bool valid() const noexcept;
    std::future<ResultType> get_future();
    void operator()(ArgTypes...);
    void make_ready_at_thread_exit(ArgTypes...);
    void reset();
```

};

STD::PACKAGED_TASK DEFAULT CONSTRUCTOR
```cpp
Constructs an std::packaged_task object.
```

Declaration
```cpp
packaged_task() noexcept;
```

Effects
Constructs  an  std::packaged_task  instance  with  no  associated  task  or  asynchronous result.

Throws
Nothing.

STD::PACKAGED_TASK CONSTRUCTION FROM A CALLABLE OBJECT
Constructs an std::packaged_task object with an associated task and asynchronous
result.

Declaration
```cpp
template<typename Callable>
packaged_task(Callable&& func);
```

Preconditions
The expression func(args...) shall be valid, where each element args-i in args...
shall be a value of the corresponding type ArgTypes-i in ArgTypes.... The return
value shall be convertible to ResultType.

Effects
Constructs  an  std::packaged_task  instance  with  an  associated  asynchronous
result of type ResultType that isn’t ready and an associated task of type Callable
that’s a copy of func.

Throws
An exception of type std::bad_alloc if the constructor is unable to allocate memory for the asynchronous result. Any exception thrown by the copy or move constructor of Callable.

STD::PACKAGED_TASK CONSTRUCTION FROM A CALLABLE OBJECT WITH AN ALLOCATOR
Constructs an std::packaged_task object with an associated task and asynchronous
result,  using  the  supplied  allocator  to  allocate  memory  for  the  associated  asynchronous result and task.

<future> header

Declaration
```cpp
template<typename Allocator,typename Callable>
packaged_task(
    std::allocator_arg_t, Allocator const& alloc,Callable&& func);
```

Preconditions
The expression func(args...) shall be valid, where each element args-i in args...
shall be a value of the corresponding type ArgTypes-i in ArgTypes.... The return
value shall be convertible to ResultType.

Effects
Constructs  an  std::packaged_task  instance  with  an  associated  asynchronous
result of type ResultType that isn’t ready and an associated task of type Callable
that’s a copy of func. The memory for the asynchronous result and task is allocated
through the allocator alloc or a copy thereof.

Throws
Any exception thrown by the allocator when trying to allocate memory for the asynchronous result or task. Any exception thrown by the copy or move constructor of
Callable.

STD::PACKAGED_TASK MOVE CONSTRUCTOR
```cpp
Constructs one std::packaged_task object from another, transferring ownership of
```

the  asynchronous  result  and  task  associated  with  the  other  std::packaged_task
object to the newly constructed instance.

Declaration
```cpp
packaged_task(packaged_task&& other) noexcept;
```

Effects
```cpp
Constructs a new std::packaged_task instance.
```

Postconditions
The asynchronous result and task associated with other prior to the invocation of
the  constructor  is  associated  with  the  newly  constructed  std::packaged_task
object. other has no associated asynchronous result.

Throws
Nothing.

STD::PACKAGED_TASK MOVE-ASSIGNMENT OPERATOR
Transfers ownership of the asynchronous result associated with one std::packaged_
task object to another.

Declaration
```cpp
packaged_task& operator=(packaged_task&& other) noexcept;
```

Effects
Transfers  ownership  of  the  asynchronous  result  and  task  associated  with  other  to
```cpp
*this, and discards any prior asynchronous result, as-if std::packaged_task(other)
.swap(*this).
```

Postconditions
The asynchronous result and task associated with other prior to the invocation of
the  move-assignment  operator  is  associated  with  *this.  other  has  no  associated
asynchronous result.

Returns
```cpp
*this
```

Throws
Nothing.

STD::PACKAGED_TASK::SWAP MEMBER FUNCTION
Exchanges ownership of the asynchronous results associated with two std::packaged
_task objects.

Declaration
```cpp
void swap(packaged_task& other) noexcept;
```

Effects
Exchanges ownership of the asynchronous results and tasks associated with other
and *this.

Postconditions
The asynchronous result and task associated with other prior to the invocation of
swap (if any) is associated with *this. The asynchronous result and task associated
with *this prior to the invocation of swap (if any) is associated with other.

Throws
Nothing.

STD::PACKAGED_TASK DESTRUCTOR
```cpp
Destroys an std::packaged_task object.
```

Declaration
```cpp
~packaged_task();
```

Effects
Destroys  *this.  If  *this  has  an  associated  asynchronous  result,  and  that  result
doesn’t have a stored task or exception, then that result becomes ready with an
std::future_error exception with an error code of std::future_errc::broken
_promise.

Throws
Nothing.

STD::PACKAGED_TASK::GET_FUTURE MEMBER FUNCTION
Retrieves an std::future instance for the asynchronous result associated with *this.

Declaration
```cpp
std::future<ResultType> get_future();
```

Preconditions
```cpp
*this has an associated asynchronous result.
```

<future> header

Returns
An std::future instance for the asynchronous result associated with *this.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::future_already_retrieved if a std::future has already been obtained for
this asynchronous result through a prior call to get_future().

STD::PACKAGED_TASK::RESET MEMBER FUNCTION
Associates  an  std::packaged_task  instance  with  a  new  asynchronous  result  for  the
same task.

Declaration
```cpp
void reset();
```

Preconditions
```cpp
*this has an associated asynchronous task.
```

Effects
As-if  *this=packaged_task(std::move(f)),  where  f  is  the  stored  task  associated
with *this.

Throws
An exception of type std::bad_alloc if memory couldn’t be allocated for the new
asynchronous result.

STD::PACKAGED_TASK::VALID MEMBER FUNCTION
Checks whether *this has an associated task and asynchronous result.

Declaration
```cpp
bool valid() const noexcept;
```

Returns
true if *this has an associated task and asynchronous result, false otherwise.

Throws
Nothing.

STD::PACKAGED_TASK::OPERATOR() FUNCTION CALL OPERATOR
Invokes the task associated with an std::packaged_task instance, and stores the return
value or exception in the associated asynchronous result.

Declaration
```cpp
void operator()(ArgTypes... args);
```

Preconditions
```cpp
*this has an associated task.
```

Effects
Invokes  the  associated  task  func  as-if  INVOKE(func,args...).  If  the  invocation
returns normally, stores the return value in the asynchronous result associated with
```cpp
*this. If the invocation returns with an exception, stores the exception in the asynchronous result associated with *this.
```

Postconditions
The asynchronous result associated with *this is ready with a stored value or exception. Any threads blocked waiting for the asynchronous result are unblocked.

Throws
An exception of type std::future_error with an error code of std::future_errc::
promise_already_satisfied if the asynchronous result already has a stored value
or exception.

Synchronization
A  successful  call  to  the  function  call  operator  synchronizes-with  a  call  to  std::
```cpp
future<ResultType>::get()  or  std::shared_future<ResultType>::get(),  which
retrieves the value or exception stored.
```

STD::PACKAGED_TASK::MAKE_READY_AT_THREAD_EXIT MEMBER FUNCTION
Invokes  the  task  associated  with  an  std::packaged_task  instance,  and  stores  the
return value or exception in the associated asynchronous result without making the
associated asynchronous result ready until thread exit.

Declaration
```cpp
void make_ready_at_thread_exit(ArgTypes... args);
```

Preconditions
```cpp
*this has an associated task.
```

Effects
Invokes  the  associated  task  func  as-if  INVOKE(func,args...).  If  the  invocation
returns normally, stores the return value in the asynchronous result associated with
```cpp
*this. If the invocation returns with an exception, stores the exception in the asynchronous result associated with *this. Schedules the associated asynchronous state
```

to be made ready when the current thread exits.

Postconditions
The asynchronous result associated with *this has a stored value or exception but
isn’t ready until the current thread exits. Threads blocked waiting for the asynchronous result will be unblocked when the current thread exits.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::promise_already_satisfied if the asynchronous result already has a stored
value or exception. An exception of type std::future_error with an error code of
std::future_errc::no_state if *this has no associated asynchronous state.

Synchronization
The completion of the thread that made a successful call to make_ready_at_thread_
exit() synchronizes-with a call to std::future<ResultType>::get() or std::shared
_future<ResultType>::get(), which retrieves the value or exception stored.

<future> header

```cpp
D.4.4 std::promise class template
```

The std::promise class template provides a means of setting an asynchronous result,
which may be retrieved from another thread through an instance of std::future.

 The ResultType template parameter is the type of the value that can be stored in

the asynchronous result.

 A std::future associated with the asynchronous result of a particular std::promise
instance  can  be  obtained  by  calling  the  get_future()  member  function.  The  asynchronous result is set either to a value of type ResultType with the set_value() member function or to an exception with the set_exception() member function.

 Instances of std::promise are MoveConstructible and MoveAssignable but not

CopyConstructible or CopyAssignable.

Class definition
```cpp
template<typename ResultType>
class promise
{
```

public:
```cpp
    promise();
    promise(promise&&) noexcept;
    ~promise();
    promise& operator=(promise&&) noexcept;

    template<typename Allocator>
    promise(std::allocator_arg_t, Allocator const&);

    promise(promise const&) = delete;
    promise& operator=(promise const&) = delete;

    void swap(promise& ) noexcept;

    std::future<ResultType> get_future();

    void set_value(see description);
    void set_exception(std::exception_ptr p);
```

};

STD::PROMISE DEFAULT CONSTRUCTOR
```cpp
Constructs an std::promise object.
```

Declaration
```cpp
promise();
```

Effects
Constructs  an  std::promise  instance  with  an  associated  asynchronous  result  of
type ResultType that’s not ready.

Throws
An exception of type std::bad_alloc if the constructor is unable to allocate memory for the asynchronous result.

STD::PROMISE ALLOCATOR CONSTRUCTOR
Constructs an std::promise object, using the supplied allocator to allocate memory
for the associated asynchronous result.

Declaration
```cpp
template<typename Allocator>
promise(std::allocator_arg_t, Allocator const& alloc);
```

Effects
Constructs  an  std::promise  instance  with  an  associated  asynchronous  result  of
type ResultType that isn’t ready. The memory for the asynchronous result is allocated through the allocator alloc.

Throws
Any exception thrown by the allocator when attempting to allocate memory for the
asynchronous result.

STD::PROMISE MOVE CONSTRUCTOR
Constructs  one  std::promise  object  from  another,  transferring  ownership  of  the
asynchronous result associated with the other std::promise object to the newly constructed instance.

Declaration
```cpp
promise(promise&& other) noexcept;
```

Effects
```cpp
Constructs a new std::promise instance.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the constructor  is  associated  with  the  newly  constructed  std::promise  object.  other  has
no associated asynchronous result.

Throws
Nothing.

STD::PROMISE MOVE-ASSIGNMENT OPERATOR
Transfers  ownership  of  the  asynchronous  result  associated  with  one  std::promise
object to another.

Declaration
```cpp
promise& operator=(promise&& other) noexcept;
```

Effects
Transfers ownership of the asynchronous result associated with other to *this. If
```cpp
*this  already  had  an  associated  asynchronous  result,  that  asynchronous  result  is
```

made  ready  with  an  exception  of  type  std::future_error  and  an  error  code  of
```cpp
std::future_errc::broken_promise.
```

Postconditions
The asynchronous result associated with other prior to the invocation of the moveassignment  operator  is  associated  with  *this.  other  has  no  associated  asynchronous result.

Returns
```cpp
*this
```

<future> header

Throws
Nothing.

STD::PROMISE::SWAP MEMBER FUNCTION
Exchanges ownership of the asynchronous results associated with two std::promise
objects.

Declaration
```cpp
void swap(promise& other);
```

Effects
Exchanges ownership of the asynchronous results associated with other and *this.

Postconditions
The asynchronous result associated with other prior to the invocation of swap (if
any) is associated with *this. The asynchronous result associated with *this prior
to the invocation of swap (if any) is associated with other.

Throws
Nothing.

STD::PROMISE DESTRUCTOR
```cpp
Destroys an std::promise object.
```

Declaration
```cpp
~promise();
```

Effects
Destroys *this. If *this has an associated asynchronous result, and that result doesn’t
have  a  stored  value  or  exception,  that  result  becomes  ready  with  an  std::future_
error exception with an error code of std::future_errc::broken_promise.

Throws
Nothing.

STD::PROMISE::GET_FUTURE MEMBER FUNCTION
Retrieves an std::future instance for the asynchronous result associated with *this.

Declaration
```cpp
std::future<ResultType> get_future();
```

Preconditions
```cpp
*this has an associated asynchronous result.
```

Returns
An std::future instance for the asynchronous result associated with *this.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::future_already_retrieved if a std::future has already been obtained for
this asynchronous result through a prior call to get_future().

STD::PROMISE::SET_VALUE MEMBER FUNCTION
Stores a value in the asynchronous result associated with *this.

Declaration
```cpp
void promise<void>::set_value();
void promise<R&>::set_value(R& r);
void promise<R>::set_value(R const& r);
void promise<R>::set_value(R&& r);
```

Preconditions
```cpp
*this has an associated asynchronous result.
```

Effects
Stores r in the asynchronous result associated with *this if ResultType isn’t void.

Postconditions
The  asynchronous  result  associated  with  *this  is  ready  with  a  stored  value.  Any
threads blocked waiting for the asynchronous result are unblocked.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::promise_already_satisfied if the asynchronous result already has a stored
value  or  exception.  Any  exceptions  thrown  by  the  copy-constructor  or  move-constructor of r.

Synchronization
Multiple  concurrent  calls  to  set_value(),  set_value_at_thread_exit(),  set_
exception(),  and  set_exception_at_thread_exit()  are  serialized.  A  successful
call to set_value() happens-before a call to std::future<ResultType>::get() or
```cpp
std::shared_future<ResultType>::get(), which retrieves the value stored.
```

STD::PROMISE::SET_VALUE_AT_THREAD_EXIT MEMBER FUNCTION
Stores a value in the asynchronous result associated with *this without making that
result ready until the current thread exits.

Declaration
```cpp
void promise<void>::set_value_at_thread_exit();
void promise<R&>::set_value_at_thread_exit(R& r);
void promise<R>::set_value_at_thread_exit(R const& r);
void promise<R>::set_value_at_thread_exit(R&& r);
```

Preconditions
```cpp
*this has an associated asynchronous result.
```

Effects
Stores r in the asynchronous result associated with *this if ResultType isn’t void.
Marks the asynchronous result as having a stored value. Schedules the associated
asynchronous result to be made ready when the current thread exits.

Postconditions
The  asynchronous  result  associated  with  *this  has  a  stored  value  but  isn’t  ready
until the current thread exits. Threads blocked waiting for the asynchronous result
will be unblocked when the current thread exits.

<future> header

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::promise_already_satisfied if the asynchronous result already has a stored
value  or  exception.  Any  exceptions  thrown  by  the  copy-constructor  or  moveconstructor of r.

Synchronization
Multiple  concurrent  calls  to  set_value(),  set_value_at_thread_exit(),  set_
exception(), and  set_exception_at_thread_exit() are serialized. The completion of the thread that made a successful call to set_value_at_thread_exit() happens-before  a  call  to  std::future<ResultType>::get()  or  std::shared_future
<ResultType>::get(), which retrieves the stored exception.

STD::PROMISE::SET_EXCEPTION MEMBER FUNCTION
Stores an exception in the asynchronous result associated with *this.

Declaration
```cpp
void set_exception(std::exception_ptr e);
```

Preconditions
```cpp
*this has an associated asynchronous result. (bool)e is true.
```

Effects
Stores e in the asynchronous result associated with *this.

Postconditions
The  asynchronous  result  associated  with  *this  is  ready  with  a  stored  exception.
Any threads blocked waiting for the asynchronous result are unblocked.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::promise_already_satisfied if the asynchronous result already has a stored
value or exception.

Synchronization
Multiple  concurrent  calls  to  set_value()  and  set_exception()  are  serialized.  A
```cpp
successful call to set_exception() happens-before a call to std::future<Result-
```

Type>::get()  or  std::shared_future<ResultType>::get(),  which  retrieves  the
stored exception.

STD::PROMISE::SET_EXCEPTION_AT_THREAD_EXIT MEMBER FUNCTION
Stores an exception in the asynchronous result associated with *this without making
that result ready until the current thread exits.

Declaration
```cpp
void set_exception_at_thread_exit(std::exception_ptr e);
```

Preconditions
```cpp
*this has an associated asynchronous result. (bool)e is true.
```

Effects
Stores e in the asynchronous result associated with *this. Schedules the associated
asynchronous result to be made ready when the current thread exits.

Postconditions
The  asynchronous  result  associated  with  *this  has  a  stored  exception  but  isn’t
ready until the current thread exits. Threads blocked waiting for the asynchronous
result will be unblocked when the current thread exits.

Throws
An  exception  of  type  std::future_error  with  an  error  code  of  std::future_
errc::promise_already_satisfied if the asynchronous result already has a stored
value or exception.

Synchronization
Multiple  concurrent  calls  to  set_value(),  set_value_at_thread_exit(),  set_
exception(), and  set_exception_at_thread_exit() are serialized. The completion of the thread that made a successful call to set_exception_at_thread_exit()
```cpp
happens-before  a  call  to  std::future<ResultType>::get()  or  std::shared_
```

future<ResultType>::get(), which retrieves the exception stored.

```cpp
D.4.5 std::async function template
```

std::async is a simple way of running self-contained asynchronous tasks to make use
of the available hardware concurrency. A call to  std::async returns a  std::future
that  will  contain  the  result  of  the  task.  Depending  on  the  launch  policy,  the  task  is
either run asynchronously on its own thread or synchronously on whichever thread
calls the wait() or get() member functions on that future.

Declaration
```cpp
enum class launch
{
```

    async,deferred
};

```cpp
template<typename Callable,typename ... Args>
```

future<result_of<Callable(Args...)>::type>
```cpp
async(Callable&& func,Args&& ... args);

template<typename Callable,typename ... Args>
```

future<result_of<Callable(Args...)>::type>
```cpp
async(launch policy,Callable&& func,Args&& ... args);
```

Preconditions
The  expression  INVOKE(func,args)  is  valid  for  the  supplied  values  of  func  and
args. Callable and every member of Args are MoveConstructible.

Effects
Constructs  copies  of  func  and  args...  in  internal  storage  (denoted  by  fff  and
xyz..., respectively).

If policy is std::launch::async, runs INVOKE(fff,xyz...) on its own thread.
The returned std::future will become ready when this thread is complete and will
hold either the return value or the exception thrown by the function invocation.
The destructor of the last future object associated with the asynchronous state of
the returned std::future blocks until the future is ready.

<mutex> header

If policy is std::launch::deferred, fff and xyz... are stored in the returned
std::future as a deferred function call. The first call to the wait() or get() member functions on a future that shares the same associated state will execute INVOKE
(fff,xyz...) synchronously on the thread that called wait() or get().

The  value  returned  or  exception  thrown  by  the  execution  of  INVOKE(fff,

xyz...) will be returned from a call to get() on that std::future.

If  policy  is  std::launch::async  |  std::launch::deferred  or  the  policy
argument  is  omitted,  the  behavior  is  as-if  either  std::launch::async  or  std::
launch::deferred had been specified. The implementation will choose the behavior on a call-by-call basis in order to take advantage of the available hardware concurrency without excessive oversubscription.

```cpp
In all cases, the std::async call returns immediately.
```

Synchronization
The  completion  of  the  function  invocation  happens-before  a  successful  return
from a call to wait(), get(), wait_for(), or wait_until() on any std::future or
std::shared_future  instance  that  references  the  same  associated  state  as  the
std:: future object returned from the std::async call. In the case of a policy of
std::launch::async, the completion of the thread on which the function invocation occurs also happens-before the successful return from these calls.

Throws
std::bad_alloc  if  the  required  internal  storage  can’t  be  allocated,  otherwise
std::future_error when the effects can’t be achieved, or any exception thrown
during the construction of fff or xyz....

D.5

<mutex> header
The  <mutex>  header  provides  facilities  for  ensuring  mutual  exclusion:  mutex  types,
lock types and functions, and a mechanism for ensuring an operation is performed
exactly once.

Header contents
```cpp
namespace std
{
    class mutex;
    class recursive_mutex;
    class timed_mutex;
    class recursive_timed_mutex;
    class shared_mutex;
    class shared_timed_mutex;

    struct adopt_lock_t;
    struct defer_lock_t;
    struct try_to_lock_t;
```

    constexpr adopt_lock_t adopt_lock{};
    constexpr defer_lock_t defer_lock{};
    constexpr try_to_lock_t try_to_lock{};

```cpp
    template<typename LockableType>
    class lock_guard;

    template<typename LockableType>
    class unique_lock;

    template<typename LockableType>
    class shared_lock;

    template<typename ... LockableTypes>
    class scoped_lock;

    template<typename LockableType1,typename... LockableType2>
    void lock(LockableType1& m1,LockableType2& m2...);

    template<typename LockableType1,typename... LockableType2>
    int try_lock(LockableType1& m1,LockableType2& m2...);

    struct once_flag;

    template<typename Callable,typename... Args>
    void call_once(once_flag& flag,Callable func,Args args...);
}

D.5.1 std::mutex class

The std::mutex class provides a basic mutual exclusion and synchronization facility
```

for threads that can be used to protect shared data. Prior to accessing the data protected by the mutex, the mutex must be locked by calling lock() or try_lock(). Only
one  thread  may  hold  the  lock  at  a  time,  so  if  another  thread  also  tries  to  lock  the
mutex,  it  will  fail  (try_lock())  or  block  (lock())  as  appropriate.  Once  a  thread  is
done  accessing  the  shared  data,  it  then  must  call  unlock()  to  release  the  lock  and
allow other threads to acquire it.

```cpp
 std::mutex meets the Lockable requirements.

Class definition
class mutex
{
```

public:
```cpp
    mutex(mutex const&)=delete;
    mutex& operator=(mutex const&)=delete;

    constexpr mutex() noexcept;
    ~mutex();

    void lock();
    void unlock();
    bool try_lock();
```

};

STD::MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::mutex object.
```

Declaration
```cpp
constexpr mutex() noexcept;
```

Effects
```cpp
Constructs an std::mutex instance.
```

<mutex> header

Postconditions
```cpp
The newly constructed std::mutex object is initially unlocked.
```

Throws
Nothing.

STD::MUTEX DESTRUCTOR
```cpp
Destroys an std::mutex object.
```

Declaration
```cpp
~mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::MUTEX::LOCK MEMBER FUNCTION
Acquires a lock on an std::mutex object for the current thread.

Declaration
```cpp
void lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until a lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread.
```

Throws
An exception of type std::system_error if an error occurs.

STD::MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a lock on an std::mutex object for the current thread.

Declaration
```cpp
bool try_lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::MUTEX::UNLOCK MEMBER FUNCTION
Releases a lock on an std::mutex object held by the current thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold a lock on *this.

Effects
Releases the lock on *this held by the current thread. If any threads are blocked
waiting to acquire a lock on *this, unblocks one of them.

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

```cpp
D.5.2 std::recursive_mutex class
```

The std::recursive_mutex class provides a basic mutual exclusion and synchronization facility for threads that can be used to protect shared data. Prior to accessing the
data  protected  by  the  mutex,  the  mutex  must  be  locked  by  calling  lock()  or
try_lock(). Only one thread may hold the lock at a time, so if another thread also
tries to lock the recursive_mutex, it will fail (try_lock) or block (lock) as appropriate. Once a thread is done accessing the shared data, it then must call  unlock() to
release the lock and allow other threads to acquire it.

 This mutex is recursive so a thread that holds a lock on a particular std::recursive
_mutex instance may make further calls to lock() or try_lock() to increase the lock
count. The mutex can’t be locked by another thread until the thread that acquired
the locks has called unlock once for each successful call to lock() or try_lock().

```cpp
 std::recursive_mutex meets the Lockable requirements.

Class definition
class recursive_mutex
{
```

public:
```cpp
    recursive_mutex(recursive_mutex const&)=delete;
    recursive_mutex& operator=(recursive_mutex const&)=delete;

    recursive_mutex() noexcept;
    ~recursive_mutex();

    void lock();
    void unlock();
    bool try_lock() noexcept;
```

};

<mutex> header

STD::RECURSIVE_MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::recursive_mutex object.
```

Declaration
```cpp
recursive_mutex() noexcept;
```

Effects
```cpp
Constructs an std::recursive_mutex instance.
```

Postconditions
```cpp
The newly constructed std::recursive_mutex object is initially unlocked.
```

Throws
An exception of type std::system_error if unable to create a new std::recursive
_mutex instance.

STD::RECURSIVE_MUTEX DESTRUCTOR
```cpp
Destroys an std::recursive_mutex object.
```

Declaration
```cpp
~recursive_mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::RECURSIVE_MUTEX::LOCK MEMBER FUNCTION
Acquires a lock on an std::recursive_mutex object for the current thread.

Declaration
```cpp
void lock();
```

Effects
Blocks the current thread until a lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread. If the calling thread already held a lock on
*this, the lock count is increased by one.
```

Throws
An exception of type std::system_error if an error occurs.

STD::RECURSIVE_MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a lock on an std::recursive_mutex object for the current thread.

Declaration
```cpp
bool try_lock() noexcept;
```

Effects
Attempts to acquire a lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
A  new  lock  on  *this  has  been  obtained  for  the  calling  thread  if  the  function
returns true.

Throws
Nothing.

If  the  calling  thread  already  holds  the  lock  on  *this,  the  function
NOTE
returns  true  and  the  count  of  locks  on  *this  held  by  the  calling  thread  is
increased by one. If the current thread doesn’t already hold a lock on *this,
the function may fail to acquire the lock (and return false) even if no other
thread holds a lock on *this.

STD::RECURSIVE_MUTEX::UNLOCK MEMBER FUNCTION
Releases a lock on an std::recursive_mutex object held by the current thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold a lock on *this.

Effects
Releases a lock on *this held by the current thread. If this is the last lock on *this
held  by  the  calling  thread,  any  threads  are  blocked  waiting  to  acquire  a  lock  on
```cpp
*this. Unblocks one of them.
```

Postconditions
The number of locks on *this held by the calling thread is reduced by one.

Throws
Nothing.

```cpp
D.5.3 std::timed_mutex class
```

The  std::timed_mutex class provides support for locks with timeouts on top of the
basic mutual exclusion and synchronization facility provided by std::mutex. Prior to
accessing the data protected by the mutex, the mutex must be locked by calling lock(),
try_lock(),  try_lock_for(),  or  try_lock_until().  If  a  lock  is  already  held  by
another thread, an attempt to acquire the lock will fail (try_lock()), block until the
lock  can  be  acquired  (lock()),  or  block  until  the  lock  can  be  acquired  or  the  lock
attempt  times  out  (try_lock_for()  or  try_lock_until()).  Once  a  lock  has  been
acquired (whichever function was used to acquire it), it must be released, by calling
unlock(), before another thread can acquire the lock on the mutex.

```cpp
 std::timed_mutex meets the TimedLockable requirements.

Class definition
class timed_mutex
{
```

<mutex> header

public:
```cpp
    timed_mutex(timed_mutex const&)=delete;
    timed_mutex& operator=(timed_mutex const&)=delete;

    timed_mutex();
    ~timed_mutex();

    void lock();
    void unlock();
    bool try_lock();

    template<typename Rep,typename Period>
    bool try_lock_for(
        std::chrono::duration<Rep,Period> const& relative_time);

    template<typename Clock,typename Duration>
    bool try_lock_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);
```

};

STD::TIMED_MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::timed_mutex object.
```

Declaration
```cpp
timed_mutex();
```

Effects
```cpp
Constructs an std::timed_mutex instance.
```

Postconditions
```cpp
The newly constructed std::timed_mutex object is initially unlocked.
```

Throws
An  exception  of  type  std::system_error  if  unable  to  create  a  new  std::timed
_mutex instance.

STD::TIMED_MUTEX DESTRUCTOR
```cpp
Destroys an std::timed_mutex object.
```

Declaration
```cpp
~timed_mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::TIMED_MUTEX::LOCK MEMBER FUNCTION
Acquires a lock on an std::timed_mutex object for the current thread.

Declaration
```cpp
void lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until a lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread.
```

Throws
An exception of type std::system_error if an error occurs.

STD::TIMED_MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a lock on an std::timed_mutex object for the current thread.

Declaration
```cpp
bool try_lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::TIMED_MUTEX::TRY_LOCK_FOR MEMBER FUNCTION
Attempts to acquire a lock on an std::timed_mutex object for the current thread.

Declaration
```cpp
template<typename Rep,typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a lock on *this for the calling thread within the time specified
by  relative_time.  If  relative_time.count()  is  zero  or  negative,  the  call  will
return immediately, as if it was a call to try_lock(). Otherwise, the call blocks until
either the lock has been acquired or the time period specified by relative_time
has elapsed.

Returns
true if a lock was obtained for the calling thread, false otherwise.

<mutex> header

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. The thread may be blocked for longer
than the specified duration. Where possible, the elapsed time is determined
by a steady clock.

STD::TIMED_MUTEX::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire a lock on an std::timed_mutex object for the current thread.

Declaration
```cpp
template<typename Clock,typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a lock on *this for the calling thread before the time specified
by absolute_time. If absolute_time<=Clock::now() on entry, the call will return
immediately, as if it was a call to try_lock(). Otherwise, the call blocks until either
the lock has been acquired or Clock::now() returns a time equal to or later than
absolute_time.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. There’s no guarantee as to how long
the  calling  thread  will  be  blocked,  only  that  if  the  function  returns  false,
then  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at
the point at which the thread became unblocked.

STD::TIMED_MUTEX::UNLOCK MEMBER FUNCTION
Releases a lock on an std::timed_mutex object held by the current thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold a lock on *this.

Effects
Releases the lock on *this held by the current thread. If any threads are blocked
waiting to acquire a lock on *this, unblocks one of them.

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

```cpp
D.5.4 std::recursive_timed_mutex class
```

The std::recursive_timed_mutex class provides support for locks with timeouts on
top of the mutual exclusion and synchronization facility provided by std::recursive_
mutex. Prior to accessing the data protected by the mutex, the mutex must be locked by
calling lock(), try_lock(), try_lock_for(), or try_lock_until(). If a lock is already
held by another thread, an attempt to acquire the lock will fail (try_lock()), block
until the lock can be acquired (lock()), or block until the lock can be acquired or the
lock  attempt  times  out  (try_lock_for()  or  try_lock_until()).  Once  a  lock  has
been acquired (whichever function was used to acquire it), it must be released by calling unlock() before another thread can acquire the lock on the mutex.

 This mutex is recursive, so a thread that holds a lock on a particular instance of
```cpp
std::recursive_timed_mutex may acquire additional locks on that instance through
```

any of the lock functions. All of these locks must be released by a corresponding call
to unlock() before another thread can acquire a lock on that instance.

```cpp
 std::recursive_timed_mutex meets the TimedLockable requirements.

Class definition
class recursive_timed_mutex
{
```

public:
```cpp
    recursive_timed_mutex(recursive_timed_mutex const&)=delete;
    recursive_timed_mutex& operator=(recursive_timed_mutex const&)=delete;

    recursive_timed_mutex();
    ~recursive_timed_mutex();

    void lock();
    void unlock();
    bool try_lock() noexcept;

    template<typename Rep,typename Period>
    bool try_lock_for(
        std::chrono::duration<Rep,Period> const& relative_time);

    template<typename Clock,typename Duration>
    bool try_lock_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);
```

};

<mutex> header

STD::RECURSIVE_TIMED_MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::recursive_timed_mutex object.
```

Declaration
```cpp
recursive_timed_mutex();
```

Effects
```cpp
Constructs an std::recursive_timed_mutex instance.
```

Postconditions
```cpp
The newly constructed std::recursive_timed_mutex object is initially unlocked.
```

Throws
An exception of type std::system_error if unable to create a new std::recursive
_timed_mutex instance.

STD::RECURSIVE_TIMED_MUTEX DESTRUCTOR
```cpp
Destroys an std::recursive_timed_mutex object.
```

Declaration
```cpp
~recursive_timed_mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::RECURSIVE_TIMED_MUTEX::LOCK MEMBER FUNCTION
Acquires a lock on an std::recursive_timed_mutex object for the current thread.

Declaration
```cpp
void lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until a lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread. If the calling thread already held a lock on
*this, the lock count is increased by one.
```

Throws
An exception of type std::system_error if an error occurs.

STD::RECURSIVE_TIMED_MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a lock on an std::recursive_timed_mutex object for the current
thread.

Declaration
```cpp
bool try_lock() noexcept;
```

Effects
Attempts to acquire a lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

If  the  calling  thread  already  holds  the  lock  on  *this,  the  function
NOTE
returns  true  and  the  count  of  locks  on  *this  held  by  the  calling  thread  is
increased by one. If the current thread doesn’t already hold a lock on *this,
the function may fail to acquire the lock (and return false) even if no other
thread holds a lock on *this.

STD::RECURSIVE_TIMED_MUTEX::TRY_LOCK_FOR MEMBER FUNCTION
Attempts to acquire a lock on an std::recursive_timed_mutex object for the current
thread.

Declaration
```cpp
template<typename Rep,typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Effects
Attempts to acquire a lock on *this for the calling thread within the time specified
by  relative_time.  If  relative_time.count()  is  zero  or  negative,  the  call  will
return immediately, as if it was a call to try_lock(). Otherwise, the call blocks until
either the lock has been acquired or the time period specified by relative_time
has elapsed.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

If  the  calling  thread  already  holds  the  lock  on  *this,  the  function
NOTE
returns  true  and  the  count  of  locks  on  *this  held  by  the  calling  thread  is
increased by one. If the current thread doesn’t already hold a lock on *this,
the function may fail to acquire the lock (and return false) even if no other
thread holds a lock on *this. The thread may be blocked for longer than the
specified  duration.  Where  possible,  the  elapsed  time  is  determined  by  a
steady clock.

<mutex> header

STD::RECURSIVE_TIMED_MUTEX::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire a lock on an std::recursive_timed_mutex object for the current
thread.

Declaration
```cpp
template<typename Clock,typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Effects
Attempts to acquire a lock on *this for the calling thread before the time specified
by absolute_time. If absolute_time<=Clock::now() on entry, the call will return
immediately, as if it was a call to try_lock(). Otherwise, the call blocks until either
the lock has been acquired or Clock::now() returns a time equal to or later than
absolute_time.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

If  the  calling  thread  already  holds  the  lock  on  *this,  the  function
NOTE
returns  true  and  the  count  of  locks  on  *this  held  by  the  calling  thread  is
increased by one. If the current thread doesn’t already hold a lock on *this,
the function may fail to acquire the lock (and return false) even if no other
thread holds a lock on *this. There’s no guarantee as to how long the calling
thread  will  be  blocked,  only  that  if  the  function  returns  false,  then
Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at  the
point at which the thread became unblocked.

STD::RECURSIVE_TIMED_MUTEX::UNLOCK MEMBER FUNCTION
Releases  a  lock  on  an  std::recursive_timed_mutex  object  held  by  the  current
thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold a lock on *this.

Effects
Releases a lock on *this held by the current thread. If this is the last lock on *this
held  by  the  calling  thread,  any  threads  are  blocked  waiting  to  acquire  a  lock  on
```cpp
*this. Unblocks one of them.
```

Postconditions
The number of locks on *this held by the calling thread is reduced by one.

Throws
Nothing.

```cpp
D.5.5 std::shared_mutex class
```

The std::shared_mutex class provides a mutual exclusion and synchronization facility  for  threads  that  can  be  used  to  protect  shared  data  that  is  frequently  read  and
rarely modified. It allows one thread to hold an exclusive lock, or one or more threads
to hold a shared lock. Prior to modifying the data protected by the mutex, the mutex
must  be  locked  with  an  exclusive  lock  by  calling  lock()  or  try_lock().  Only  one
thread may hold an exclusive lock at a time, so if another thread also tries to lock the
mutex,  it  will  fail  (try_lock())  or  block  (lock())  as  appropriate.  Once  a  thread  is
done modifying the shared data, it then must call  unlock() to release the lock and
allow other threads to acquire it. Threads that only want to read the protected data
may obtain a shared lock by calling lock_shared() or try_lock_shared(). Multiple
threads may hold a shared lock at a time, so if one thread holds a shared lock, then
another thread may also acquire a shared lock. If a thread tries to acquire an exclusive
lock,  that  thread  will  wait.  Once  a  thread  that  has  acquired  a  shared  lock  is  done
accessing the protected data, it must call unlock_shared() to release the shared lock.

```cpp
 std::shared_mutex meets the Lockable requirements.

Class definition
class shared_mutex
{
```

public:
```cpp
    shared_mutex(shared_mutex const&)=delete;
    shared_mutex& operator=(shared_mutex const&)=delete;

    shared_mutex() noexcept;
    ~shared_mutex();

    void lock();
    void unlock();
    bool try_lock();

    void lock_shared();
    void unlock_shared();
    bool try_lock_shared();
```

};

STD::SHARED_MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::shared_mutex object.
```

Declaration
```cpp
shared_mutex() noexcept;
```

Effects
```cpp
Constructs an std::shared_mutex instance.
```

Postconditions
```cpp
The newly constructed std::shared_mutex object is initially unlocked.
```

Throws
Nothing.

<mutex> header

STD::SHARED_MUTEX DESTRUCTOR
```cpp
Destroys an std::shared_mutex object.
```

Declaration
```cpp
~shared_mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::SHARED_MUTEX::LOCK MEMBER FUNCTION
Acquires an exclusive lock on an std::shared_mutex object for the current thread.

Declaration
```cpp
void lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until an exclusive lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread with an exclusive lock.
```

Throws
An exception ofif an error occurs.

STD::SHARED_MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts  to  acquire  an  exclusive  lock  on  an  std::shared_mutex  object  for  the  current thread.

Declaration
```cpp
bool try_lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts  to  acquire  an  exclusive  lock  on  *this  for  the  calling  thread  without
blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread with an exclusive lock if the function returns
```

true.

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::SHARED_MUTEX::UNLOCK MEMBER FUNCTION
Releases  an  exclusive  lock  on  an  std::shared_mutex  object  held  by  the  current
thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold an exclusive lock on *this.

Effects
Releases the exclusive lock on *this held by the current thread. If any threads are
blocked  waiting  to  acquire  a  lock  on  *this,  unblocks  one  thread  waiting  for  an
exclusive lock or some number of threads waiting for a shared lock.

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

STD::SHARED_MUTEX::LOCK_SHARED MEMBER FUNCTION
Acquires a shared lock on an std::shared_mutex object for the current thread.

Declaration
```cpp
void lock_shared();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until a shared lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread with a shared lock.
```

Throws
An exception ofif an error occurs.

STD::SHARED_MUTEX::TRY_LOCK_SHARED MEMBER FUNCTION
Attempts  to  acquire  a  shared  lock  on  an  std::shared_mutex  object  for  the  current
thread.

Declaration
```cpp
bool try_lock_shared();
```

Preconditions
The calling thread must not hold a lock on *this.

<mutex> header

Effects
Attempts to acquire a shared lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this  is  locked  by  the  calling  thread  with  a  shared  lock  if  the  function  returns
```

true.

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::SHARED_MUTEX::UNLOCK_SHARED MEMBER FUNCTION
Releases a shared lock on an std::shared_mutex object held by the current thread.

Declaration
```cpp
void unlock_shared();
```

Preconditions
The calling thread must hold a shared lock on *this.

Effects
Releases  the  shared  lock  on  *this  held  by  the  current  thread.  If  this  is  the  last
shared  lock  on  *this,  and  any  threads  are  blocked  waiting  to  acquire  a  lock  on
```cpp
*this,  unblocks  one  thread  waiting  for  an  exclusive  lock  or  some  number  of
threads waiting for a shared lock.
```

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

```cpp
D.5.6 std::shared_timed_mutex class
```

The  std::shared_timed_mutex  class  provides  a  mutual  exclusion  and  synchronization facility for threads that can be used to protect shared data that is frequently read
and rarely modified. It allows one thread to hold an exclusive lock, or one or more
threads to hold a shared lock. Prior to modifying the data protected by the mutex, the
mutex must be locked with an exclusive lock by calling lock() or try_lock(). Only
one thread may hold an exclusive lock at a time, so if another thread also tries to lock
the mutex, it will fail (try_lock()) or block (lock()) as appropriate. Once a thread is
done modifying the shared data, it then must call  unlock() to release the lock and
allow other threads to acquire it. Threads that only want to read the protected data
may obtain a shared lock by calling lock_shared() or try_lock_shared(). Multiple
threads may hold a shared lock at a time, so if one thread holds a shared lock, then
another thread may also acquire a shared lock. If a thread tries to acquire an exclusive

lock,  that  thread  will  wait.  Once  a  thread  that  has  acquired  a  shared  lock  is  done
accessing the protected data, it must call unlock_shared() to release the shared lock.

```cpp
 std::shared_timed_mutex meets the Lockable requirements.

Class definition
class shared_timed_mutex
{
```

public:
```cpp
    shared_timed_mutex(shared_timed_mutex const&)=delete;
    shared_timed_mutex& operator=(shared_timed_mutex const&)=delete;

    shared_timed_mutex() noexcept;
    ~shared_timed_mutex();

    void lock();
    void unlock();
    bool try_lock();

    template<typename Rep,typename Period>
    bool try_lock_for(
        std::chrono::duration<Rep,Period> const& relative_time);

    template<typename Clock,typename Duration>
    bool try_lock_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);

    void lock_shared();
    void unlock_shared();
    bool try_lock_shared();

    template<typename Rep,typename Period>
    bool try_lock_shared_for(
        std::chrono::duration<Rep,Period> const& relative_time);

    template<typename Clock,typename Duration>
    bool try_lock_shared_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);
```

};

STD::SHARED_TIMED_MUTEX DEFAULT CONSTRUCTOR
```cpp
Constructs an std::shared_timed_mutex object.
```

Declaration
```cpp
shared_timed_mutex() noexcept;
```

Effects
```cpp
Constructs an std::shared_timed_mutex instance.
```

Postconditions
```cpp
The newly constructed std::shared_timed_mutex object is initially unlocked.
```

Throws
Nothing.

<mutex> header

STD::SHARED_TIMED_MUTEX DESTRUCTOR
```cpp
Destroys an std::shared_timed_mutex object.
```

Declaration
```cpp
~shared_timed_mutex();
```

Preconditions
```cpp
*this must not be locked.
```

Effects
Destroys *this.

Throws
Nothing.

STD::SHARED_TIMED_MUTEX::LOCK MEMBER FUNCTION
Acquires an exclusive lock on an std::shared_timed_mutex object for the current
thread.

Declaration
```cpp
void lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until an exclusive lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread with an exclusive lock.
```

Throws
An exception of type std::system_error if an error occurs.

STD::SHARED_TIMED_MUTEX::TRY_LOCK MEMBER FUNCTION
Attempts to acquire an exclusive lock on an std::shared_timed_mutex object for the
current thread.

Declaration
```cpp
bool try_lock();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts  to  acquire  an  exclusive  lock  on  *this  for  the  calling  thread  without
blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread with an exclusive lock if the function returns
```

true.

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::SHARED_TIMED_MUTEX::TRY_LOCK_FOR MEMBER FUNCTION
Attempts to acquire an exclusive lock on an std::shared_timed_mutex object for the
current thread.

Declaration
```cpp
template<typename Rep,typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts  to  acquire  an  exclusive  lock  on  *this  for  the  calling  thread  within  the
time  specified  by  relative_time.  If  relative_time.count()  is  zero  or  negative,
the call will return immediately, as if it was a call to try_lock(). Otherwise, the call
blocks  until  either  the  lock  has  been  acquired  or  the  time  period  specified  by
relative_time has elapsed.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. The thread may be blocked for longer
than the specified duration. Where possible, the elapsed time is determined
by a steady clock.

STD::SHARED_TIMED_MUTEX::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire an exclusive lock on an std::shared_timed_mutex object for the
current thread.

Declaration
```cpp
template<typename Clock,typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts  to  acquire  an  exclusive  lock  on  *this  for  the  calling  thread  before  the
time specified by absolute_time. If absolute_time<=Clock::now() on entry, the
call  will  return  immediately,  as  if  it  was  a  call  to  try_lock().  Otherwise,  the  call

<mutex> header

blocks until either the lock has been acquired or Clock::now() returns a time equal
to or later than absolute_time.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. There’s no guarantee as to how long
the  calling  thread  will  be  blocked,  only  that  if  the  function  returns  false,
then  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at
the point at which the thread became unblocked.

STD::SHARED_TIMED_MUTEX::UNLOCK MEMBER FUNCTION
Releases  an  exclusive  lock  on  an  std::shared_timed_mutex  object  held  by  the  current thread.

Declaration
```cpp
void unlock();
```

Preconditions
The calling thread must hold an exclusive lock on *this.

Effects
Releases the exclusive lock on *this held by the current thread. If any threads are
blocked  waiting  to  acquire  a  lock  on  *this,  unblocks  one  thread  waiting  for  an
exclusive lock or some number of threads waiting for a shared lock.

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

STD::SHARED_TIMED_MUTEX::LOCK_SHARED MEMBER FUNCTION
Acquires a shared lock on an std::shared_timed_mutex object for the current thread.

Declaration
```cpp
void lock_shared();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Blocks the current thread until a shared lock on *this can be obtained.

Postconditions
```cpp
*this is locked by the calling thread with a shared lock.
```

Throws
An exception of type std::system_error if an error occurs.

STD::SHARED_TIMED_MUTEX::TRY_LOCK_SHARED MEMBER FUNCTION
Attempts to acquire a shared lock on an std::shared_timed_mutex object for the current thread.

Declaration
```cpp
bool try_lock_shared();
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a shared lock on *this for the calling thread without blocking.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread with a shared lock if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this.

STD::SHARED_TIMED_MUTEX::TRY_LOCK_SHARED_FOR MEMBER FUNCTION
Attempts to acquire a shared lock on an std::shared_timed_mutex object for the current thread.

Declaration
```cpp
template<typename Rep,typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a shared lock on *this for the calling thread within the time
specified by relative_time. If relative_time.count() is zero or negative, the call
will return immediately, as if it was a call to try_lock(). Otherwise, the call blocks
until either the lock has been acquired or the time period specified by relative
_time has elapsed.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. The thread may be blocked for longer

<mutex> header

than the specified duration. Where possible, the elapsed time is determined
by a steady clock.

STD::SHARED_TIMED_MUTEX::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire a shared lock on an std::shared_timed_mutex object for the current thread.

Declaration
```cpp
template<typename Clock,typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The calling thread must not hold a lock on *this.

Effects
Attempts to acquire a shared lock on *this for the calling thread before the time
specified  by  absolute_time.  If  absolute_time<=Clock::now()  on  entry,  the  call
will return immediately, as if it was a call to try_lock(). Otherwise, the call blocks
until either the lock has been acquired or Clock::now() returns a time equal to or
later than absolute_time.

Returns
true if a lock was obtained for the calling thread, false otherwise.

Postconditions
```cpp
*this is locked by the calling thread if the function returns true.
```

Throws
Nothing.

NOTE The function may fail to acquire the lock (and return false) even if
no other thread holds a lock on *this. There’s no guarantee as to how long
the  calling  thread  will  be  blocked,  only  that  if  the  function  returns  false,
then  Clock::now()  returns  a  time  equal  to  or  later  than  absolute_time  at
the point at which the thread became unblocked.

STD::SHARED_TIMED_MUTEX::UNLOCK_SHARED MEMBER FUNCTION
Releases  a  shared  lock  on  an  std::shared_timed_mutex  object  held  by  the  current
thread.

Declaration
```cpp
void unlock_shared();
```

Preconditions
The calling thread must hold a shared lock on *this.

Effects
Releases the shared lock on *this held by the current thread. If this is the last shared
lock  on  *this,  and  any  threads  are  blocked  waiting  to  acquire  a  lock  on  *this,
unblocks one thread waiting for an exclusive lock or some number of threads waiting for a shared lock.

Postconditions
```cpp
*this is not locked by the calling thread.
```

Throws
Nothing.

```cpp
D.5.7 std::lock_guard class template

The  std::lock_guard  class  template  provides  a  basic  lock  ownership  wrapper.  The
```

type of mutex being locked is specified by template parameter Mutex and must meet
the  Lockable  requirements.  The  specified  mutex  is  locked  in  the  constructor  and
unlocked  in  the  destructor.  This  provides  a  simple  means  of  locking  a  mutex  for  a
block of code and ensuring that the mutex is unlocked when the block is left, whether
that’s by running off the end, by the use of a control flow statement such as break or
return, or by throwing an exception.

  Instances  of  std::lock_guard  are  not  MoveConstructible,  CopyConstructible,

or CopyAssignable.

Class definition
```cpp
template <class Mutex>
class lock_guard
{
```

public:
```cpp
    typedef Mutex mutex_type;

    explicit lock_guard(mutex_type& m);
    lock_guard(mutex_type& m, adopt_lock_t);
    ~lock_guard();

    lock_guard(lock_guard const& ) = delete;
    lock_guard& operator=(lock_guard const& ) = delete;
```

};

STD::LOCK_GUARD LOCKING CONSTRUCTOR
Constructs an std::lock_guard instance that locks the supplied mutex.

Declaration
```cpp
explicit lock_guard(mutex_type& m);
```

Effects
Constructs an std::lock_guard instance that references the supplied mutex. Calls
m.lock().

Throws
Any exceptions thrown by m.lock().

Postconditions
```cpp
*this owns a lock on m.
```

STD::LOCK_GUARD LOCK-ADOPTING CONSTRUCTOR
Constructs an std::lock_guard instance that owns the lock on the supplied mutex.

Declaration
```cpp
lock_guard(mutex_type& m,std::adopt_lock_t);
```

<mutex> header

Preconditions
The calling thread must own a lock on m.

Effects
Constructs an std::lock_guard instance that references the supplied mutex and
takes ownership of the lock on m held by the calling thread.

Throws
Nothing.

Postconditions
```cpp
*this owns the lock on m held by the calling thread.
```

STD::LOCK_GUARD DESTRUCTOR
Destroys an std::lock_guard instance and unlocks the corresponding mutex.

Declaration
```cpp
~lock_guard();
```

Effects
Calls m.unlock() for the mutex instance, m, supplied when *this was constructed.

Throws
Nothing.

```cpp
D.5.8 std::scoped_lock class template

The  std::scoped_lock  class  template  provides  a  basic  lock  ownership  wrapper  for
```

multiple mutexes at once. The type of mutex being locked is specified by the template
parameter pack Mutexes and each must meet the Lockable requirements. The specified mutexes are locked in the constructor and unlocked in the destructor. This provides a simple means of locking a set of mutexes for a block of code and ensuring that
the  mutexes  are  unlocked  when  the  block  is  left,  whether  that’s  by  running  off  the
end, by the use of a control flow statement such as break or return, or by throwing an
exception.

 Instances of std::scoped_lock are not MoveConstructible, CopyConstructible,

or CopyAssignable.

Class definition
```cpp
template <class ... Mutexes>
class scoped_lock
{
```

public:

```cpp
    explicit scoped_lock(Mutexes& ... m);
    scoped_lock(Mutexes& ... m, adopt_lock_t);
    ~scoped_lock();

    scoped_lock(scoped_lock const& ) = delete;
    scoped_lock& operator=(scoped_lock const& ) = delete;
```

};

STD::SCOPED_LOCK LOCKING CONSTRUCTOR
Constructs an std::scoped_lock instance that locks the supplied mutexes.

Declaration
```cpp
explicit scoped_lock(Mutexes& ... m);
```

Effects
Constructs  an  std::scoped_lock  instance  that  references  the  supplied  mutexes.
Uses a combination of calls to m.lock(), m.try_lock(), and m.unlock() on each
of  the  mutexes,  in  order  to  avoid  deadlock,  using  the  same  algorithm  as  the
```cpp
std::lock() free function.
```

Throws
Any exceptions thrown by the m.lock() and m.try_lock() calls.

Postconditions
```cpp
*this owns a lock on the supplied mutexes.
```

STD::SCOPED_LOCK LOCK-ADOPTING CONSTRUCTOR
Constructs an std::scoped_lock instance that owns the lock on the supplied mutexes;
they must already be locked by the calling thread.

Declaration
```cpp
scoped_lock(Mutexes& ... m,std::adopt_lock_t);
```

Preconditions
The calling thread must own a lock on the mutexes in m.

Effects
Constructs  an  std::scoped_lock  instance  that  references  the  supplied  mutexes
and takes ownership of the lock on the mutexes in m held by the calling thread.

Throws
Nothing.

Postconditions
```cpp
*this owns the lock on the supplied mutexes held by the calling thread.
```

STD::SCOPED_LOCK DESTRUCTOR
Destroys an std::scoped_lock instance and unlocks the corresponding mutexes.

Declaration
```cpp
~scoped_lock();
```

Effects
Calls m.unlock() for each of the mutex instances m supplied when *this was constructed.

Throws
Nothing.

```cpp
D.5.9 std::unique_lock class template
```

The std::unique_lock class template provides a more general lock ownership wrapper than std::lock_guard. The type of mutex being locked is specified by the template
parameter Mutex, which must meet the BasicLockable requirements. In general, the
specified mutex is locked in the constructor and unlocked in the destructor, although

<mutex> header

additional constructors and member functions are provided to allow other possibilities. This provides a means of locking a mutex for a block of code and ensuring that
the mutex is unlocked when the block is left, whether that’s by running off the end, by
the use of a control flow statement such as break or return, or by throwing an exception.  The  wait  functions  of  std::condition_variable  require  an  instance  of  std::
unique_lock<std::mutex>,  and  all  instantiations  of  std::unique_lock  are  suitable
for  use  with  the  Lockable  parameter  for  the  std::condition_variable_any  wait
functions.

 If the supplied Mutex type meets the Lockable requirements, then std::unique_
lock<Mutex>  also  meets  the  Lockable  requirements.  If,  in  addition,  the  supplied
```cpp
Mutex type meets the TimedLockable requirements, then std::unique_lock<Mutex>
also meets the TimedLockable requirements.
```

 Instances of std::unique_lock are MoveConstructible and MoveAssignable but

not CopyConstructible or CopyAssignable.

Class definition
```cpp
template <class Mutex>
class unique_lock
{
```

public:
```cpp
    typedef Mutex mutex_type;

    unique_lock() noexcept;
    explicit unique_lock(mutex_type& m);
    unique_lock(mutex_type& m, adopt_lock_t);
    unique_lock(mutex_type& m, defer_lock_t) noexcept;
    unique_lock(mutex_type& m, try_to_lock_t);

    template<typename Clock,typename Duration>
    unique_lock(
        mutex_type& m,
        std::chrono::time_point<Clock,Duration> const& absolute_time);

    template<typename Rep,typename Period>
    unique_lock(
        mutex_type& m,
        std::chrono::duration<Rep,Period> const& relative_time);

    ~unique_lock();

    unique_lock(unique_lock const& ) = delete;
    unique_lock& operator=(unique_lock const& ) = delete;

    unique_lock(unique_lock&& );
    unique_lock& operator=(unique_lock&& );

    void swap(unique_lock& other) noexcept;

    void lock();
    bool try_lock();
    template<typename Rep, typename Period>
    bool try_lock_for(
        std::chrono::duration<Rep,Period> const& relative_time);
    template<typename Clock, typename Duration>
    bool try_lock_until(

        std::chrono::time_point<Clock,Duration> const& absolute_time);
    void unlock();

    explicit operator bool() const noexcept;
    bool owns_lock() const noexcept;
    Mutex* mutex() const noexcept;
    Mutex* release() noexcept;
```

};

STD::UNIQUE_LOCK DEFAULT CONSTRUCTOR
```cpp
Constructs an std::unique_lock instance with no associated mutex.
```

Declaration
```cpp
unique_lock() noexcept;
```

Effects
Constructs an std::unique_lock instance that has no associated mutex.

Postconditions
this->mutex()==NULL, this->owns_lock()==false.

STD::UNIQUE_LOCK LOCKING CONSTRUCTOR
Constructs an std::unique_lock instance that locks the supplied mutex.

Declaration
```cpp
explicit unique_lock(mutex_type& m);
```

Effects
Constructs  an  std::unique_lock  instance  that  references  the  supplied  mutex.
Calls m.lock().

Throws
Any exceptions thrown by m.lock().

Postconditions
this->owns_lock()==true, this->mutex()==&m.

STD::UNIQUE_LOCK LOCK-ADOPTING CONSTRUCTOR
Constructs an std::unique_lock instance that owns the lock on the supplied mutex.

Declaration
```cpp
unique_lock(mutex_type& m,std::adopt_lock_t);
```

Preconditions
The calling thread must own a lock on m.

Effects
Constructs an std::unique_lock instance that references the supplied mutex and
takes ownership of the lock on m held by the calling thread.

Throws
Nothing.

Postconditions
this->owns_lock()==true, this->mutex()==&m.

<mutex> header

STD::UNIQUE_LOCK DEFERRED-LOCK CONSTRUCTOR
Constructs an std::unique_lock instance that doesn’t own the lock on the supplied
mutex.

Declaration
```cpp
unique_lock(mutex_type& m,std::defer_lock_t) noexcept;
```

Effects
Constructs an std::unique_lock instance that references the supplied mutex.

Throws
Nothing.

Postconditions
this->owns_lock()==false, this->mutex()==&m.

STD::UNIQUE_LOCK TRY-TO-LOCK CONSTRUCTOR
Constructs  an  std::unique_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a lock on that mutex.

Declaration
```cpp
unique_lock(mutex_type& m,std::try_to_lock_t);
```

Preconditions
The  Mutex  type  used  to  instantiate  std::unique_lock  must  meet  the  Lockable
requirements.

Effects
Constructs  an  std::unique_lock  instance  that  references  the  supplied  mutex.
Calls m.try_lock().

Throws
Nothing.

Postconditions
this->owns_lock() returns the result of the m.try_lock() call, this->mutex()==&m.

STD::UNIQUE_LOCK TRY-TO-LOCK CONSTRUCTOR WITH A DURATION TIMEOUT
Constructs  an  std::unique_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a lock on that mutex.

Declaration
```cpp
template<typename Rep,typename Period>
unique_lock(
    mutex_type& m,
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The Mutex type used to instantiate std::unique_lock must meet the Timed-Lockable
requirements.

Effects
Constructs an std::unique_lock instance that references the supplied mutex. Calls
m.try_lock_for(relative_time).

Throws
Nothing.

Postconditions
this->owns_lock() returns the result of the m.try_lock_for() call, this->mutex()
==&m.

STD::UNIQUE_LOCK TRY-TO-LOCK CONSTRUCTOR WITH A TIME_POINT TIMEOUT
Constructs  an  std::unique_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a lock on that mutex.

Declaration
```cpp
template<typename Clock,typename Duration>
unique_lock(
    mutex_type& m,
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The Mutex type used to instantiate std::unique_lock must meet the Timed-Lockable
requirements.

Effects
Constructs an std::unique_lock instance that references the supplied mutex. Calls
m.try_lock_until(absolute_time).

Throws
Nothing.

Postconditions
this->owns_lock()  returns  the  result  of  the  m.try_lock_until()  call,  this->
mutex()==&m.

STD::UNIQUE_LOCK MOVE-CONSTRUCTOR
Transfers ownership of a lock from one std::unique_lock object to a newly-created
```cpp
std::unique_lock object.
```

Declaration
```cpp
unique_lock(unique_lock&& other) noexcept;
```

Effects
Constructs an std::unique_lock instance. If other owned a lock on a mutex prior
to  the  constructor  invocation,  that  lock  is  now  owned  by  the  newly  created
```cpp
std::unique_lock object.
```

Postconditions
For a newly constructed std::unique_lock object, x, x.mutex() is equal to the value
of other.mutex() prior to the constructor invocation, and x.owns_lock() is equal to
the value of other.owns_lock() prior to the constructor invocation. other.mutex()
==NULL, other.owns_lock()==false.

Throws
Nothing.

<mutex> header

NOTE std::unique_lock objects are not CopyConstructible, so there’s no
copy constructor, only this move constructor.

STD::UNIQUE_LOCK MOVE-ASSIGNMENT OPERATOR
Transfers ownership of a lock from one std::unique_lock object to another std::
unique_lock object.

Declaration
```cpp
unique_lock& operator=(unique_lock&& other) noexcept;
```

Effects
If this->owns_lock()returns true prior to the call, calls this->unlock(). If other
owned a lock on a mutex prior to the assignment, that lock is now owned by *this.

Postconditions
this->mutex() is equal to the value of other.mutex() prior to the assignment, and
this->owns_lock() is equal to the value of other.owns_lock() prior to the assignment. other.mutex()==NULL, other.owns_lock()==false.

Throws
Nothing.

NOTE std::unique_lock objects are not CopyAssignable, so there’s no copyassignment operator, only this move-assignment operator.

STD::UNIQUE_LOCK DESTRUCTOR
Destroys an std::unique_lock instance and unlocks the corresponding mutex if it’s
owned by the destroyed instance.

Declaration
```cpp
~unique_lock();
```

Effects
If this->owns_lock()returns true, calls this->mutex()->unlock().

Throws
Nothing.

STD::UNIQUE_LOCK::SWAP MEMBER FUNCTION
Exchanges  ownership  of  their  associated  unique_locks  of  execution  between  two
```cpp
std::unique_lock objects.
```

Declaration
```cpp
void swap(unique_lock& other) noexcept;
```

Effects
If other owns a lock on a mutex prior to the call, that lock is now owned by *this.
If *this owns a lock on a mutex prior to the call, that lock is now owned by other.

Postconditions
this->mutex()  is  equal  to  the  value  of  other.mutex()  prior  to  the  call.  other
.mutex() is equal to the value of this->mutex() prior to the call. this->owns_lock()

is equal to the value of other.owns_lock() prior to the call. other.owns_lock() is
equal to the value of this->owns_lock() prior to the call.

Throws
Nothing.

SWAP NONMEMBER FUNCTION FOR STD::UNIQUE_LOCK
```cpp
Exchanges ownership of their associated mutex locks between two std::unique_lock
```

objects.

Declaration
```cpp
void swap(unique_lock& lhs,unique_lock& rhs) noexcept;
```

Effects
lhs.swap(rhs)

Throws
Nothing.

STD::UNIQUE_LOCK::LOCK MEMBER FUNCTION
Acquires a lock on the mutex associated with *this.

Declaration
```cpp
void lock();
```

Preconditions
this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->lock().

Throws
Any  exceptions  thrown  by  this->mutex()->lock().  std::system_error  with  an
error  code  of  std::errc::operation_not_permitted  if  this->mutex()==NULL.
std::system_error  with  an  error  code  of  std::errc::resource_deadlock_would
_occur if this->owns_lock()==true on entry.

Postconditions
this->owns_lock()==true.

STD::UNIQUE_LOCK::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a lock on the mutex associated with *this.

Declaration
```cpp
bool try_lock();
```

Preconditions
The  Mutex  type  used  to  instantiate  std::unique_lock  must  meet  the  Lockable
requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock().

<mutex> header

Returns
true if the call to this->mutex()->try_lock() returned true, false otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock(). std::system_error with
an error code of std::errc::operation_not_permitted if this->mutex()==NULL.
std::system_error  with  an  error  code  of  std::errc::resource_deadlock_would
_occur if this->owns_lock()==true on entry.

Postconditions
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::UNIQUE_LOCK::UNLOCK MEMBER FUNCTION
Releases a lock on the mutex associated with *this.

Declaration
```cpp
void unlock();
```

Preconditions
this->mutex()!=NULL, this->owns_lock()==true.

Effects
Calls this->mutex()->unlock().

Throws
Any exceptions thrown by this->mutex()->unlock(). std::system_error with an
error code of std::errc::operation_not_permitted if this->owns_lock()==false
on entry.

Postconditions
this->owns_lock()==false.

STD::UNIQUE_LOCK::TRY_LOCK_FOR MEMBER FUNCTION
Attempts to acquire a lock on the mutex associated with *this within the time specified.

Declaration
```cpp
template<typename Rep, typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The Mutex type used to instantiate std::unique_lock must meet the TimedLockable requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock_for(relative_time).

Returns
true if the call to this->mutex()->try_lock_for() returned true, false otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock_for(). std::system_error
with an error code of std::errc::operation_not_permitted if this->mutex()==

NULL. std::system_error with an error code of std::errc::resource_deadlock_
would_occur if this->owns_lock()==true on entry.

Postconditions
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::UNIQUE_LOCK::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire a lock on the mutex associated with *this within the time specified.

Declaration
```cpp
template<typename Clock, typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The Mutex type used to instantiate std::unique_lock must meet the Timed-Lockable
requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock_until(absolute_time).

Returns
true if the call to this->mutex()->try_lock_until() returned true, false otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock_until(). std::system_error
with an error code of std::errc::operation_not_permitted if this-> mutex()==
NULL.  std::system_error with an error code of  std::errc::resource_deadlock
_would_occur if this->owns_lock()==true on entry.

Postcondition
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::UNIQUE_LOCK::OPERATOR BOOL MEMBER FUNCTION
Checks whether or not *this owns a lock on a mutex.

Declaration
```cpp
explicit operator bool() const noexcept;
```

Returns
this->owns_lock().

Throws
Nothing.

NOTE This is an explicit conversion operator, so it’s only implicitly called
in  contexts  where  the  result  is  used  as  a  Boolean  and  not  where  the  result
would be treated as an integer value of 0 or 1.

<mutex> header

STD::UNIQUE_LOCK::OWNS_LOCK MEMBER FUNCTION
Checks whether or not *this owns a lock on a mutex.

Declaration
```cpp
bool owns_lock() const noexcept;
```

Returns
true if *this owns a lock on a mutex, false otherwise.

Throws
Nothing.

STD::UNIQUE_LOCK::MUTEX MEMBER FUNCTION
Returns the mutex associated with *this if any.

Declaration
```cpp
mutex_type* mutex() const noexcept;
```

Returns
A pointer to the mutex associated with *this if any, NULL otherwise.

Throws
Nothing.

STD::UNIQUE_LOCK::RELEASE MEMBER FUNCTION
Returns the mutex associated with *this if any, and releases that association.

Declaration
```cpp
mutex_type* release() noexcept;
```

Effects
Breaks the association of the mutex with *this without unlocking any locks held.

Returns
A pointer to the mutex associated with *this prior to the call if any, NULL otherwise.

Postconditions
this->mutex()==NULL, this->owns_lock()==false.

Throws
Nothing.

If this->owns_lock() would have returned true prior to the call, the

NOTE
caller would now be responsible for unlocking the mutex.

```cpp
D.5.10 std::shared_lock class template
```

The  std::shared_lock class template provides an equivalent to  std::unique_lock,
except that it acquires a shared lock rather than an exclusive lock. The type of mutex
being  locked  is  specified  by  the  template  parameter  Mutex,  which  must  meet  the
SharedLockable requirements. In general, the specified mutex is locked in the constructor and unlocked in the destructor, although additional constructors and member  functions  are  provided  to  allow  other  possibilities.  This  provides  a  means  of
locking a mutex for a block of code and ensuring that the mutex is unlocked when

the block is left, whether that’s by running off the end, by the use of a control flow
statement such as break or return, or by throwing an exception. All instantiations of
std::shared_lock  are  suitable  for  use  with  the  Lockable  parameter  for  the  std::
condition_variable_any wait functions.

  Every  std::shared_lock<Mutex>  meets  the  Lockable  requirements.  If,  in  addition,  the  supplied  Mutex  type  meets  the  SharedTimedLockable  requirements,  then
```cpp
std::shared_lock<Mutex> also meets the TimedLockable requirements.
```

 Instances of std::shared_lock are MoveConstructible and MoveAssignable but

not CopyConstructible or CopyAssignable.

Class definition
```cpp
template <class Mutex>
class shared_lock
{
```

public:
```cpp
    typedef Mutex mutex_type;

    shared_lock() noexcept;
    explicit shared_lock(mutex_type& m);
    shared_lock(mutex_type& m, adopt_lock_t);
    shared_lock(mutex_type& m, defer_lock_t) noexcept;
    shared_lock(mutex_type& m, try_to_lock_t);

    template<typename Clock,typename Duration>
    shared_lock(
        mutex_type& m,
        std::chrono::time_point<Clock,Duration> const& absolute_time);

    template<typename Rep,typename Period>
    shared_lock(
        mutex_type& m,
        std::chrono::duration<Rep,Period> const& relative_time);

    ~shared_lock();

    shared_lock(shared_lock const& ) = delete;
    shared_lock& operator=(shared_lock const& ) = delete;

    shared_lock(shared_lock&& );
    shared_lock& operator=(shared_lock&& );

    void swap(shared_lock& other) noexcept;

    void lock();
    bool try_lock();
    template<typename Rep, typename Period>
    bool try_lock_for(
        std::chrono::duration<Rep,Period> const& relative_time);
    template<typename Clock, typename Duration>
    bool try_lock_until(
        std::chrono::time_point<Clock,Duration> const& absolute_time);
    void unlock();

    explicit operator bool() const noexcept;
    bool owns_lock() const noexcept;
    Mutex* mutex() const noexcept;
```

<mutex> header

```cpp
    Mutex* release() noexcept;
```

};

STD::SHARED_LOCK DEFAULT CONSTRUCTOR
```cpp
Constructs an std::shared_lock instance with no associated mutex.
```

Declaration
```cpp
shared_lock() noexcept;
```

Effects
Constructs an std::shared_lock instance that has no associated mutex.

Postconditions
this->mutex()==NULL, this->owns_lock()==false.

STD::SHARED_LOCK LOCKING CONSTRUCTOR
Constructs an std::shared_lock instance that acquires a shared lock on the supplied
mutex.

Declaration
```cpp
explicit shared_lock(mutex_type& m);
```

Effects
Constructs an std::shared_lock instance that references the supplied mutex. Calls
m.lock_shared().

Throws
Any exceptions thrown by m.lock_shared().

Postconditions
this->owns_lock()==true, this->mutex()==&m.

STD::SHARED_LOCK LOCK-ADOPTING CONSTRUCTOR
Constructs an std::shared_lock instance that owns the lock on the supplied mutex.

Declaration
```cpp
shared_lock(mutex_type& m,std::adopt_lock_t);
```

Preconditions
The calling thread must own a shared lock on m.

Effects
Constructs an std::shared_lock instance that references the supplied mutex and
takes ownership of the shared lock on m held by the calling thread.

Throws
Nothing.

Postconditions
this->owns_lock()==true, this->mutex()==&m.

STD::SHARED_LOCK DEFERRED-LOCK CONSTRUCTOR
Constructs an std::shared_lock instance that doesn’t own the lock on the supplied
mutex.

Declaration
```cpp
shared_lock(mutex_type& m,std::defer_lock_t) noexcept;
```

Effects
Constructs an std::shared_lock instance that references the supplied mutex.

Throws
Nothing.

Postconditions
this->owns_lock()==false, this->mutex()==&m.

STD::SHARED_LOCK TRY-TO-LOCK CONSTRUCTOR
Constructs  an  std::shared_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a shared lock on that mutex.

Declaration
```cpp
shared_lock(mutex_type& m,std::try_to_lock_t);
```

Preconditions
The  Mutex  type  used  to  instantiate  std::shared_lock  must  meet  the  Lockable
requirements.

Effects
Constructs  an  std::shared_lock  instance  that  references  the  supplied  mutex.
Calls m.try_lock_shared().

Throws
Nothing.

Postconditions
this->owns_lock()  returns  the  result  of  the  m.try_lock_shared()  call,  this->
mutex()==&m.

STD::SHARED_LOCK TRY-TO-LOCK CONSTRUCTOR WITH A DURATION TIMEOUT
Constructs  an  std::shared_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a shared lock on that mutex.

Declaration
```cpp
template<typename Rep,typename Period>
shared_lock(
    mutex_type& m,
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The Mutex type used to instantiate std::shared_lock must meet the SharedTimed-
Lockable requirements.

Effects
Constructs  an  std::shared_lock  instance  that  references  the  supplied  mutex.
Calls m.try_lock_shared_for(relative_time).

Throws
Nothing.

<mutex> header

Postconditions
this->owns_lock() returns the result of the m.try_lock_shared_for() call, this->
mutex()==&m.

STD::SHARED_LOCK TRY-TO-LOCK CONSTRUCTOR WITH A TIME_POINT TIMEOUT
Constructs  an  std::shared_lock  instance  associated  with  the  supplied  mutex  and
tries to acquire a shared lock on that mutex.

Declaration
```cpp
template<typename Clock,typename Duration>
shared_lock(
    mutex_type& m,
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The Mutex type used to instantiate std::shared_lock must meet the SharedTimed-
Lockable requirements.

Effects
Constructs  an  std::shared_lock  instance  that  references  the  supplied  mutex.
Calls m.try_lock_shared_until(absolute_time).

Throws
Nothing.

Postconditions
this->owns_lock() returns the result of the m.try_lock_shared_until() call, this
```cpp
->mutex()==&m.
```

STD::SHARED_LOCK MOVE-CONSTRUCTOR
Transfers ownership of a shared lock from one std::shared_lock object to a newly
```cpp
created std::shared_lock object.
```

Declaration
```cpp
shared_lock(shared_lock&& other) noexcept;
```

Effects
Constructs  an  std::shared_lock  instance.  If  other  owned  a  shared  lock  on  a
mutex prior to the constructor invocation, that lock is now owned by the newly created std::shared_lock object.

Postconditions
For a newly-constructed std::shared_lock object, x, x.mutex() is equal to the value
of other.mutex() prior to the constructor invocation, and x.owns_lock() is equal to
the value of other.owns_lock() prior to the constructor invocation. other.mutex()
==NULL, other.owns_lock()==false.

Throws
Nothing.

NOTE std::shared_lock  objects  are  not  CopyConstructible,  so  there’s  no
copy constructor, only this move constructor.

STD::SHARED_LOCK MOVE-ASSIGNMENT OPERATOR
Transfers ownership of a shared lock from one std::shared_lock object to another
```cpp
std::shared_lock object.
```

Declaration
```cpp
shared_lock& operator=(shared_lock&& other) noexcept;
```

Effects
If this->owns_lock()returns true prior to the call, calls this->unlock(). If other
owned a shared lock on a mutex prior to the assignment, that lock is now owned by
```cpp
*this.
```

Postconditions
this->mutex() is equal to the value of other.mutex() prior to the assignment, and
this->owns_lock() is equal to the value of other.owns_lock() prior to the assignment. other.mutex()==NULL, other.owns_lock()==false.

Throws
Nothing.

NOTE std::shared_lock objects are not CopyAssignable, so there’s no copyassignment operator, only this move-assignment operator.

STD::SHARED_LOCK DESTRUCTOR
Destroys an std::shared_lock instance and unlocks the corresponding mutex if it’s
owned by the destroyed instance.

Declaration
```cpp
~shared_lock();
```

Effects
If this->owns_lock()returns true, calls this->mutex()->unlock_shared().

Throws
Nothing.

STD::SHARED_LOCK::SWAP MEMBER FUNCTION
Exchanges  ownership  of  their  associated  shared_locks  of  execution  between  two
```cpp
std::shared_lock objects.
```

Declaration
```cpp
void swap(shared_lock& other) noexcept;
```

Effects
If other owns a lock on a mutex prior to the call, that lock is now owned by *this.
If *this owns a lock on a mutex prior to the call, that lock is now owned by other.

Postconditions
this->mutex()  is  equal  to  the  value  of  other.mutex()  prior  to  the  call.  other
.mutex()  is  equal  to  the  value  of  this->mutex()  prior  to  the  call.  this->owns
_lock() is equal to the value of other.owns_lock() prior to the call. other.owns
_lock() is equal to the value of this->owns_lock() prior to the call.

<mutex> header

Throws
Nothing.

SWAP NONMEMBER FUNCTION FOR STD::SHARED_LOCK
```cpp
Exchanges ownership of their associated mutex locks between two std::shared_lock
```

objects.

Declaration
```cpp
void swap(shared_lock& lhs,shared_lock& rhs) noexcept;
```

Effects
lhs.swap(rhs)

Throws
Nothing.

STD::SHARED_LOCK::LOCK MEMBER FUNCTION
Acquires a shared lock on the mutex associated with *this.

Declaration
```cpp
void lock();
```

Preconditions
this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->lock_shared().

Throws
Any  exceptions  thrown  by  this->mutex()->lock_shared().  std::system_error
with  an  error  code  of  std::errc::operation_not_permitted  if  this->mutex()
==NULL. std::system_error with an error code of std::errc::resource_deadlock
_would_occur if this->owns_lock()==true on entry.

Postconditions
this->owns_lock()==true.

STD::SHARED_LOCK::TRY_LOCK MEMBER FUNCTION
Attempts to acquire a shared lock on the mutex associated with *this.

Declaration
```cpp
bool try_lock();
```

Preconditions
The  Mutex  type  used  to  instantiate  std::shared_lock  must  meet  the  Lockable
requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock_shared().

Returns
true  if  the  call  to  this->mutex()->try_lock_shared()  returned  true,  false
otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock_shared(). std::system_error
with an error code of std::errc::operation_not_permitted if this->mutex()==
NULL.  std::system_error  with  an  error  code  of  std::errc::resource_deadlock
_would_occur if this->owns_lock()==true on entry.

Postconditions
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::SHARED_LOCK::UNLOCK MEMBER FUNCTION
Releases a shared lock on the mutex associated with *this.

Declaration
```cpp
void unlock();
```

Preconditions
this->mutex()!=NULL, this->owns_lock()==true.

Effects
Calls this->mutex()->unlock_shared().

Throws
Any exceptions thrown by this->mutex()->unlock_shared(). std::system_error
with an error code of std::errc::operation_not_permitted if this->owns_lock()
== false on entry.

Postconditions
this->owns_lock()==false.

STD::SHARED_LOCK::TRY_LOCK_FOR MEMBER FUNCTION
Attempts to acquire a shared lock on the mutex associated with *this within the time
specified.

Declaration
```cpp
template<typename Rep, typename Period>
bool try_lock_for(
    std::chrono::duration<Rep,Period> const& relative_time);
```

Preconditions
The Mutex type used to instantiate std::shared_lock must meet the SharedTimed-
Lockable requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock_shared_for(relative_time).

Returns
true if the call to this->mutex()->try_lock_shared_for() returned true, false
otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock_shared_for(). std::system
_error  with  an  error  code  of  std::errc::operation_not_permitted  if  this->

<mutex> header

mutex()==NULL.  std::system_error with an error code of  std::errc::resource
_deadlock_would_occur if this->owns_lock()==true on entry.

Postconditions
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::SHARED_LOCK::TRY_LOCK_UNTIL MEMBER FUNCTION
Attempts to acquire a shared lock on the mutex associated with *this within the time
specified.

Declaration
```cpp
template<typename Clock, typename Duration>
bool try_lock_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Preconditions
The Mutex type used to instantiate std::shared_lock must meet the SharedTimed-
Lockable requirements. this->mutex()!=NULL, this->owns_lock()==false.

Effects
Calls this->mutex()->try_lock_shared_until(absolute_time).

Returns
true if the call to this->mutex()->try_lock_shared_until() returned true, false
otherwise.

Throws
Any exceptions thrown by this->mutex()->try_lock_shared_until(). std::system
_error  with  an  error  code  of  std::errc::operation_not_permitted  if  this->
mutex()==NULL. std::system_error with an error code of std::errc::resource_
deadlock_would_occur if this->owns_lock()==true on entry.

Postcondition
If  the  function  returns  true,  this->owns_lock()==true,  otherwise  this->owns_
lock()==false.

STD::SHARED_LOCK::OPERATOR BOOL MEMBER FUNCTION
Checks whether or not *this owns a shared lock on a mutex.

Declaration
```cpp
explicit operator bool() const noexcept;
```

Returns
this->owns_lock().

Throws
Nothing.

NOTE This is an explicit conversion operator, so it’s only implicitly called
in  contexts  where  the  result  is  used  as  a  Boolean  and  not  where  the  result
would be treated as an integer value of 0 or 1.

STD::SHARED_LOCK::OWNS_LOCK MEMBER FUNCTION
Checks whether or not *this owns a shared lock on a mutex.

Declaration
```cpp
bool owns_lock() const noexcept;
```

Returns
true if *this owns a shared lock on a mutex, false otherwise.

Throws
Nothing.

STD::SHARED_LOCK::MUTEX MEMBER FUNCTION
Returns the mutex associated with *this if any.

Declaration
```cpp
mutex_type* mutex() const noexcept;
```

Returns
A pointer to the mutex associated with *this if any, NULL otherwise.

Throws
Nothing.

STD::SHARED_LOCK::RELEASE MEMBER FUNCTION
Returns the mutex associated with *this if any, and releases that association.

Declaration
```cpp
mutex_type* release() noexcept;
```

Effects
Breaks the association of the mutex with *this without unlocking any locks held.

Returns
A pointer to the mutex associated with *this prior to the call if any, NULL otherwise.

Postconditions
this->mutex()==NULL, this->owns_lock()==false.

Throws
Nothing.

If this->owns_lock() would have returned true prior to the call, the

NOTE
caller would now be responsible for unlocking the mutex.

```cpp
D.5.11 std::lock function template
```

<mutex> header

```cpp
The std::lock function template provides a means of locking more than one mutex
```

at the same time, without risk of deadlock resulting from inconsistent lock orders.

Declaration
```cpp
template<typename LockableType1,typename... LockableType2>
void lock(LockableType1& m1,LockableType2& m2...);
```

Preconditions
The  types  of  the  supplied  lockable  objects,  LockableType1,  LockableType2,  ...,
shall conform to the Lockable requirements.

Effects
Acquires a lock on each of the supplied lockable objects, m1, m2, ..., by an unspecified sequence of calls to the lock(), try_lock(), and unlock() members of those
types that avoid deadlock.

Postconditions
The current thread owns a lock on each of the supplied lockable objects.

Throws
Any exceptions thrown by the calls to lock(), try_lock(), and unlock().

If  an  exception  propagates  out  of  the  call  to  std::lock,  then
NOTE
unlock() shall have been called for any of the objects m1, m2, ... for which a
lock has been acquired in the function by a call to lock() or try_lock().

```cpp
D.5.12 std::try_lock function template
```

The  std::try_lock  function  template  allows  you  to  try  to  lock  a  set  of  lockable
objects in one go, so either they are all locked or none are locked.

Declaration
```cpp
template<typename LockableType1,typename... LockableType2>
int try_lock(LockableType1& m1,LockableType2& m2...);
```

Preconditions
The  types  of  the  supplied  lockable  objects,  LockableType1,  LockableType2,  ...,
shall conform to the Lockable requirements.

Effects
Tries to acquires a lock on each of the supplied lockable objects, m1, m2, ..., by calling try_lock() on each in turn. If a call to try_lock() returns false or throws an
exception,  locks  already  acquired  are  released  by  calling  unlock()  on  the  corresponding lockable object.

Returns
-1 if all locks were acquired (each call to try_lock() returned true), otherwise the
zero-based index of the object for which the call to try_lock() returned false.

Postconditions
If the function returns -1, the current thread owns a lock on each of the supplied
lockable objects. Otherwise, any locks acquired by this call have been released.

Throws
Any exceptions thrown by the calls to try_lock().

If  an  exception  propagates  out  of  the  call  to  std::try_lock,  then
NOTE
unlock() shall have been called for any of the objects, m1, m2, ..., for which a
lock has been acquired in the function by a call to try_lock().

```cpp
D.5.13 std::once_flag class
```

Instances of std::once_flag are used with std::call_once to ensure that a particular
function is called exactly once, even if multiple threads invoke the call concurrently.

 Instances of std::once_flag are not CopyConstructible, CopyAssignable, Move-

Constructible, or MoveAssignable.

Class definition
```cpp
struct once_flag
{
    constexpr once_flag() noexcept;

    once_flag(once_flag const& ) = delete;
    once_flag& operator=(once_flag const& ) = delete;
```

};

STD::ONCE_FLAG DEFAULT CONSTRUCTOR
```cpp
The std::once_flag default constructor creates a new std::once_flag instance in a
```

state, which indicates that the associated function hasn’t been called.

Declaration
```cpp
constexpr once_flag() noexcept;
```

Effects
Constructs a new std::once_flag instance in a state, which indicates that the associated  function  hasn’t  been  called.  Because  this  is  a  constexpr  constructor,  an
instance with static storage duration is constructed as part of the static initialization
phase, which avoids race conditions and order-of-initialization problems.

```cpp
D.5.14 std::call_once function template
```

std::call_once is used with an instance of std::once_flag to ensure that a particular
function is called exactly once, even if multiple threads invoke the call concurrently.

Declaration
```cpp
template<typename Callable,typename... Args>
void call_once(std::once_flag& flag,Callable func,Args args...);
```

Preconditions
The  expression  INVOKE(func,args)  is  valid  for  the  supplied  values  of  func  and
args. Callable and every member of Args are MoveConstructible.

Effects
Invocations of std::call_once on the same std::once_flag object are serialized.
If  there  has  been  no  prior  effective  std::call_once  invocation  on  the  same

<ratio> header

std::once_flag  object,  the  argument  func  (or  a  copy  thereof)  is  called  as-if  by
INVOKE(func,args), and the invocation of std::call_once is effective if and only
if the invocation of func returns without throwing an exception. If an exception is
thrown, the exception is propagated to the caller. If there has been a prior effective
std::call_once  on  the  same  std::once_flag  object,  the  invocation  of  std::
call_once returns without invoking func.

Synchronization
The completion of an effective std::call_once invocation on an std::once_flag
```cpp
object  happens-before  all  subsequent  std::call_once  invocations  on  the  same
std::once_flag object.
```

Throws
std::system_error when the effects can’t be achieved or for any exception propagated from the invocation of func.

D.6

<ratio> header
The <ratio> header provides support for compile-time rational arithmetic.

Header contents
```cpp
namespace std
{
    template<intmax_t N,intmax_t D=1>
    class ratio;

    // ratio arithmetic
    template <class R1, class R2>
    using ratio_add = see description;

    template <class R1, class R2>
    using ratio_subtract = see description;

    template <class R1, class R2>
    using ratio_multiply = see description;

    template <class R1, class R2>
    using ratio_divide = see description;

    // ratio comparison
    template <class R1, class R2>
    struct ratio_equal;

    template <class R1, class R2>
    struct ratio_not_equal;

    template <class R1, class R2>
    struct ratio_less;

    template <class R1, class R2>
    struct ratio_less_equal;

    template <class R1, class R2>
    struct ratio_greater;

    template <class R1, class R2>
    struct ratio_greater_equal;

    typedef ratio<1, 1000000000000000000> atto;
    typedef ratio<1, 1000000000000000> femto;
    typedef ratio<1, 1000000000000> pico;
    typedef ratio<1, 1000000000> nano;
    typedef ratio<1, 1000000> micro;
    typedef ratio<1, 1000> milli;
    typedef ratio<1, 100> centi;
    typedef ratio<1, 10> deci;
    typedef ratio<10, 1> deca;
    typedef ratio<100, 1> hecto;
    typedef ratio<1000, 1> kilo;
    typedef ratio<1000000, 1> mega;
    typedef ratio<1000000000, 1> giga;
    typedef ratio<1000000000000, 1> tera;
    typedef ratio<1000000000000000, 1> peta;
    typedef ratio<1000000000000000000, 1> exa;
}

D.6.1 std::ratio class template

The  std::ratio  class  template  provides  a  mechanism  for  compile-time  arithmetic
involving  rational  values  such  as  one  half  (std::ratio<1,2>),  two  thirds  (std::
```

ratio<2,3>),  or  fifteen  forty-thirds  (std::ratio<15,43>).  It’s  used  within  the  C++
Standard Library for specifying the period for instantiating the std::chrono::duration
```cpp
class template.

Class definition
template <intmax_t N, intmax_t D = 1>
class ratio
{
```

public:
```cpp
    typedef ratio<num, den> type;
    static constexpr intmax_t num= see below;
    static constexpr intmax_t den= see below;
```

};

Requirements
D may not be zero.

Description
num and  den are the numerator and denominator of the fraction  N/D reduced to
lowest terms. den is always positive. If N and D are the same sign, num is positive;
otherwise num is negative.

Examples
ratio<4,6>::num == 2
ratio<4,6>::den == 3
ratio<4,-6>::num == -2
ratio<4,-6>::den == 3

<ratio> header

```cpp
D.6.2 std::ratio_add template alias

The std::ratio_add template alias provides a mechanism for adding two std::ratio
values at compile time, using rational arithmetic.
```

Definition
```cpp
template <class R1, class R2>
using ratio_add = std::ratio<see below>;
```

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Effects
ratio_add<R1,R2>  is  defined  as  an  alias  for  an  instantiation  of  std::ratio  that
represents the sum of the fractions represented by R1 and R2 if that sum can be calculated without overflow. If the calculation of the result overflows, the program is
ill-formed.  In  the  absence  of  arithmetic  overflow,  std::ratio_add<R1,R2>  shall
have the same num and den values as std::ratio<R1::num * R2::den + R2::num *
R1::den, R1::den * R2::den>.

Examples
```cpp
std::ratio_add<std::ratio<1,3>, std::ratio<2,5> >::num == 11
std::ratio_add<std::ratio<1,3>, std::ratio<2,5> >::den == 15

std::ratio_add<std::ratio<1,3>, std::ratio<7,6> >::num == 3
std::ratio_add<std::ratio<1,3>, std::ratio<7,6> >::den == 2

D.6.3 std::ratio_subtract template alias

The std::ratio_subtract template alias provides a mechanism for subtracting two
std::ratio values at compile time, using rational arithmetic.
```

Definition
```cpp
template <class R1, class R2>
using ratio_subtract = std::ratio<see below>;
```

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Effects
ratio_subtract<R1,R2>  is  defined  as  an  alias  for  an  instantiation  of  std::ratio
that represents the difference of the fractions represented by R1 and R2 if that difference  can  be  calculated  without  overflow.  If  the  calculation  of  the  result  overflows, the program is ill-formed. In the absence of arithmetic overflow, std::ratio
_subtract<R1,R2> shall have the same num and den values as std::ratio<R1::num
```cpp
* R2::den - R2::num * R1::den, R1::den * R2::den>.
```

Examples
```cpp
std::ratio_subtract<std::ratio<1,3>, std::ratio<1,5> >::num == 2
std::ratio_subtract<std::ratio<1,3>, std::ratio<1,5> >::den == 15

std::ratio_subtract<std::ratio<1,3>, std::ratio<7,6> >::num == -5
std::ratio_subtract<std::ratio<1,3>, std::ratio<7,6> >::den == 6

D.6.4 std::ratio_multiply template alias

The std::ratio_multiply template alias provides a mechanism for multiplying two
std::ratio values at compile time, using rational arithmetic.
```

Definition
```cpp
template <class R1, class R2>
using ratio_multiply = std::ratio<see below>;
```

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Effects
ratio_multiply<R1,R2>  is  defined  as  an  alias  for  an  instantiation  of  std::ratio
that represents the product of the fractions represented by R1 and R2 if that product can be calculated without overflow. If the calculation of the result overflows, the
program is ill-formed. In the absence of arithmetic overflow, std::ratio_multiply
<R1,R2> shall have the same num and den values as std::ratio<R1::num * R2::num,
R1::den * R2::den>.

Examples
```cpp
std::ratio_multiply<std::ratio<1,3>, std::ratio<2,5> >::num == 2
std::ratio_multiply<std::ratio<1,3>, std::ratio<2,5> >::den == 15

std::ratio_multiply<std::ratio<1,3>, std::ratio<15,7> >::num == 5
std::ratio_multiply<std::ratio<1,3>, std::ratio<15,7> >::den == 7

D.6.5 std::ratio_divide template alias

The std::ratio_divide template alias provides a mechanism for dividing two std::
ratio values at compile time, using rational arithmetic.
```

Definition
```cpp
template <class R1, class R2>
using ratio_divide = std::ratio<see below>;
```

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Effects
ratio_divide<R1,R2> is defined as an alias for an instantiation of std::ratio that
represents the result of dividing the fractions represented by R1 and R2 if that result
can be calculated without overflow. If the calculation overflows, the program is illformed.  In  the  absence  of  arithmetic  overflow,  std::ratio_divide<R1,R2>  shall
have the same  num and  den values as  std::ratio<R1::num  *  R2::den, R1::den  *
R2::num>.

Examples
```cpp
std::ratio_divide<std::ratio<1,3>, std::ratio<2,5> >::num == 5
std::ratio_divide<std::ratio<1,3>, std::ratio<2,5> >::den == 6

std::ratio_divide<std::ratio<1,3>, std::ratio<15,7> >::num == 7
std::ratio_divide<std::ratio<1,3>, std::ratio<15,7> >::den == 45
```

<ratio> header

```cpp
D.6.6 std::ratio_equal class template

The std::ratio_equal class template provides a mechanism for comparing two std::
ratio values for equality at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_equal:
    public std::integral_constant<
```

        bool,(R1::num == R2::num) && (R1::den == R2::den)>
{};

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Examples
```cpp
std::ratio_equal<std::ratio<1,3>, std::ratio<2,6> >::value == true
std::ratio_equal<std::ratio<1,3>, std::ratio<1,6> >::value == false
std::ratio_equal<std::ratio<1,3>, std::ratio<2,3> >::value == false
std::ratio_equal<std::ratio<1,3>, std::ratio<1,3> >::value == true

D.6.7 std::ratio_not_equal class template

The std::ratio_not_equal class template provides a mechanism for comparing two
std::ratio values for inequality at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_not_equal:
    public std::integral_constant<bool,!ratio_equal<R1,R2>::value>
```

{};

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Examples
```cpp
std::ratio_not_equal<std::ratio<1,3>, std::ratio<2,6> >::value == false
std::ratio_not_equal<std::ratio<1,3>, std::ratio<1,6> >::value == true
std::ratio_not_equal<std::ratio<1,3>, std::ratio<2,3> >::value == true
std::ratio_not_equal<std::ratio<1,3>, std::ratio<1,3> >::value == false

D.6.8 std::ratio_less class template

The std::ratio_less class template provides a mechanism for comparing two std::
ratio values at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_less:
    public std::integral_constant<bool,see below>
```

{};

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

Effects
```cpp
std::ratio_less<R1,R2>  derives  from  std::integral_constant<bool,  value  >,
```

where value is (R1::num * R2::den) < (R2::num * R1::den). Where possible, implementations shall use a method of calculating the result that avoids overflow. If overflow occurs, the program is ill-formed.

Examples
```cpp
std::ratio_less<std::ratio<1,3>, std::ratio<2,6> >::value == false
std::ratio_less<std::ratio<1,6>, std::ratio<1,3> >::value == true
std::ratio_less<
    std::ratio<999999999,1000000000>,
    std::ratio<1000000001,1000000000> >::value == true
std::ratio_less<
    std::ratio<1000000001,1000000000>,
    std::ratio<999999999,1000000000> >::value == false

D.6.9 std::ratio_greater class template

The  std::ratio_greater  class  template  provides  a  mechanism  for  comparing  two
std::ratio values at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_greater:
    public std::integral_constant<bool,ratio_less<R2,R1>::value>
```

{};

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

```cpp
D.6.10 std::ratio_less_equal class template

The std::ratio_less_equal class template provides a mechanism for comparing two
std::ratio values at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_less_equal:
    public std::integral_constant<bool,!ratio_less<R2,R1>::value>
```

{};

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

```cpp
D.6.11 std::ratio_greater_equal class template

The std::ratio_greater_equal class template provides a mechanism for comparing
two std::ratio values at compile time, using rational arithmetic.

Class definition
template <class R1, class R2>
class ratio_greater_equal:
    public std::integral_constant<bool,!ratio_less<R1,R2>::value>
```

{};

<thread> header

Preconditions
R1 and R2 must be instantiations of the std::ratio class template.

D.7

<thread> header
The  <thread>  header  provides  facilities  for  managing  and  identifying  threads  and
provides functions for making the current thread sleep.

Header contents
```cpp
namespace std
{
    class thread;

    namespace this_thread
    {
        thread::id get_id() noexcept;

        void yield() noexcept;

        template<typename Rep,typename Period>
        void sleep_for(
            std::chrono::duration<Rep,Period> sleep_duration);

        template<typename Clock,typename Duration>
        void sleep_until(
            std::chrono::time_point<Clock,Duration> wake_time);
    }
}

D.7.1 std::thread class
```

The std::thread class is used to manage a thread of execution. It provides a means of
starting a new thread of execution and waiting for the completion of a thread of execution. It also provides a means for identifying and provides other functions for managing threads of execution.

Class definition
```cpp
class thread
{
```

public:
```cpp
    // Types
    class id;
    typedef implementation-defined native_handle_type; // optional

    // Construction and Destruction
    thread() noexcept;

    ~thread();

    template<typename Callable,typename Args...>
    explicit thread(Callable&& func,Args&&... args);

    // Copying and Moving
    thread(thread const& other) = delete;
    thread(thread&& other) noexcept;

    thread& operator=(thread const& other) = delete;
    thread& operator=(thread&& other) noexcept;

    void swap(thread& other) noexcept;

    void join();
    void detach();
    bool joinable() const noexcept;

    id get_id() const noexcept;

    native_handle_type native_handle();

    static unsigned hardware_concurrency() noexcept;
```

};

```cpp
void swap(thread& lhs,thread& rhs);
```

STD::THREAD::ID CLASS
An instance of std::thread::id identifies a particular thread of execution.

Class definition
```cpp
class thread::id
{
```

public:
```cpp
    id() noexcept;
```

};

```cpp
bool operator==(thread::id x, thread::id y) noexcept;
bool operator!=(thread::id x, thread::id y) noexcept;
bool operator<(thread::id x, thread::id y) noexcept;
bool operator<=(thread::id x, thread::id y) noexcept;
bool operator>(thread::id x, thread::id y) noexcept;
bool operator>=(thread::id x, thread::id y) noexcept;

template<typename charT, typename traits>
```

basic_ostream<charT, traits>&
```cpp
operator<< (basic_ostream<charT, traits>&& out, thread::id id);
```

Notes
The std::thread::id value that identifies a particular thread of execution shall be
distinct  from  the  value  of  a  default-constructed  std::thread::id  instance  and
from any value that represents another thread of execution.

The std::thread::id values for particular threads aren’t predictable and may

vary between executions of the same program.

std::thread::id  is  CopyConstructible  and  CopyAssignable,  so  instances  of

```cpp
std::thread::id may be freely copied and assigned.
```

STD::THREAD::ID DEFAULT CONSTRUCTOR
Constructs an std::thread::id object that doesn’t represent any thread of execution.

Declaration
```cpp
id() noexcept;
```

Effects
Constructs an std::thread::id instance that has the singular not any thread value.

Throws
Nothing.

<thread> header

```cpp
NOTE All default-constructed std::thread::id instances store the same value.
```

STD::THREAD::ID EQUALITY COMPARISON OPERATOR
Compares two instances of std::thread::id to see if they represent the same thread
of execution.

Declaration
```cpp
bool operator==(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
true if both lhs and rhs represent the same thread of execution or both have the
singular  not  any  thread  value.  false  if  lhs  and  rhs  represent  different  threads  of
execution or one represents a thread of execution and the other has the singular
not any thread value.

Throws
Nothing.

STD::THREAD::ID INEQUALITY COMPARISON OPERATOR
Compares two instances of std::thread::id to see if they represent different threads
of execution.

Declaration
```cpp
bool operator!=(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
!(lhs==rhs)

Throws
Nothing.

STD::THREAD::ID LESS-THAN COMPARISON OPERATOR
Compares two instances of std::thread::id to see if one lies before the other in the
total ordering of thread ID values.

Declaration
```cpp
bool operator<(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
true  if  the  value  of  lhs  occurs  before  the  value  of  rhs  in  the  total  ordering  of
thread ID values. If lhs!=rhs, exactly one of lhs<rhs or rhs<lhs returns true and
the other returns false. If lhs==rhs, lhs<rhs and rhs<lhs both return false.

Throws
Nothing.

NOTE The singular not any thread value held by a default-constructed std::
```cpp
thread::id instance compares less than any std::thread::id instance that
```

represents  a  thread  of  execution.  If  two  instances  of  std::thread::id  are
equal, neither is less than the other. Any set of distinct std::thread::id values forms a total order, which is consistent throughout an execution of a program. This order may vary between executions of the same program.

STD::THREAD::ID LESS-THAN OR EQUAL COMPARISON OPERATOR
Compares two instances of std::thread::id to see if one lies before the other in the
total ordering of thread ID values or is equal to it.

Declaration
```cpp
bool operator<=(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
!(rhs<lhs)

Throws
Nothing.

STD::THREAD::ID GREATER-THAN COMPARISON OPERATOR
Compares two instances of std::thread::id to see if one lies after the other in the
total ordering of thread ID values.

Declaration
```cpp
bool operator>(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
rhs<lhs

Throws
Nothing.

STD::THREAD::ID GREATER-THAN OR EQUAL COMPARISON OPERATOR
Compares two instances of std::thread::id to see if one lies after the other in the
total ordering of thread ID values or is equal to it.

Declaration
```cpp
bool operator>=(std::thread::id lhs,std::thread::id rhs) noexcept;
```

Returns
!(lhs<rhs)

Throws
Nothing.

STD::THREAD::ID STREAM INSERTION OPERATOR
Writes a string representation of the std::thread::id value into the specified stream.

Declaration
```cpp
template<typename charT, typename traits>
```

basic_ostream<charT, traits>&
```cpp
operator<< (basic_ostream<charT, traits>&& out, thread::id id);
```

Effects
Inserts a string representation of the std::thread::id value into the specified stream.

Returns
out

Throws
Nothing.

<thread> header

NOTE The  format  of  the  string  representation  isn’t  specified.  Instances  of
std::thread::id  that  compare  equal  have  the  same  representation,  and
instances that aren’t equal have distinct representations.

STD::THREAD::NATIVE_HANDLE_TYPE TYPEDEF
native_handle_type is a typedef to a type that can be used with platform-specific APIs.

Declaration
```cpp
typedef implementation-defined native_handle_type;
```

NOTE This typedef is optional. If present, the implementation should provide
a type that’s suitable for use with native platform-specific APIs.

STD::THREAD::NATIVE_HANDLE MEMBER FUNCTION
Returns a value of type native_handle_type that represents the thread of execution
associated with *this.

Declaration
```cpp
native_handle_type native_handle();
```

NOTE This function is optional. If present, the value returned should be suitable for use with the native platform-specific APIs.

STD::THREAD DEFAULT CONSTRUCTOR
Constructs an std::thread object without an associated thread of execution.

Declaration
```cpp
thread() noexcept;
```

Effects
Constructs an std::thread instance that has no associated thread of execution.

Postconditions
```cpp
For a newly constructed std::thread object, x, x.get_id()==id().
```

Throws
Nothing.

STD::THREAD CONSTRUCTOR
Constructs an std::thread object associated with a new thread of execution.

Declaration
```cpp
template<typename Callable,typename Args...>
explicit thread(Callable&& func,Args&&... args);
```

Preconditions
func and each element of args must be MoveConstructible.

Effects
Constructs an std::thread instance and associates it with a newly created thread of
execution. Copies or moves func and each element of args into internal storage
that  persists  for  the  lifetime  of  the  new  thread  of  execution.  Performs  INVOKE
(copy-of-func,copy-of-args) on the new thread of execution.

Postconditions
```cpp
For a newly constructed std::thread object, x, x.get_id()!=id().
```

Throws
An  exception  of  type  std::system_error  if  unable  to  start  the  new  thread.  Any
exception thrown by copying func or args into internal storage.

Synchronization
The  invocation  of  the  constructor  happens-before  the  execution  of  the  supplied
function on the newly created thread of execution.

STD::THREAD MOVE-CONSTRUCTOR
Transfers ownership of a thread of execution from one std::thread object to a newly
```cpp
created std::thread object.
```

Declaration
```cpp
thread(thread&& other) noexcept;
```

Effects
Constructs an std::thread instance. If other has an associated thread of execution
prior to the constructor invocation, that thread of execution is now associated with
```cpp
the newly created std::thread object. Otherwise, the newly created std::thread
object has no associated thread of execution.
```

Postconditions
For a newly constructed std::thread object, x, x.get_id() is equal to the value of
other.get_id() prior to the constructor invocation. other.get_id()==id().

Throws
Nothing.

NOTE std::thread  objects  are  not  CopyConstructible,  so  there’s  no  copy
constructor, only this move constructor.

STD::THREAD DESTRUCTOR
```cpp
Destroys an std::thread object.
```

Declaration
```cpp
~thread();
```

Effects
Destroys *this. If *this has an associated thread of execution (this->joinable()
would return true), calls std::terminate() to abort the program.

Throws
Nothing.

STD::THREAD MOVE-ASSIGNMENT OPERATOR
Transfers ownership of a thread of execution from one std::thread object to another
```cpp
std::thread object.
```

Declaration
```cpp
thread& operator=(thread&& other) noexcept;
```

<thread> header

Effects
If this->joinable()returns true prior to the call, calls std::terminate() to abort
the  program.  If  other  has  an  associated  thread  of  execution  prior  to  the  assignment, that thread of execution is now associated with *this. Otherwise *this has
no associated thread of execution.

Postconditions
this->get_id()  is  equal  to  the  value  of  other.get_id()  prior  to  the  call.  other
.get_id()==id().

Throws
Nothing.

NOTE std::thread  objects  are  not  CopyAssignable,  so  there’s  no  copyassignment operator, only this move-assignment operator.

STD::THREAD::SWAP MEMBER FUNCTION
Exchanges  ownership  of  their  associated  threads  of  execution  between  two  std::
thread objects.

Declaration
```cpp
void swap(thread& other) noexcept;
```

Effects
If other has an associated thread of execution prior to the call, that thread of execution is now associated with *this. Otherwise *this has no associated thread of
execution.  If  *this  has  an  associated  thread  of  execution  prior  to  the  call,  that
thread of execution is now associated with other. Otherwise other has no associated thread of execution.

Postconditions
this->get_id()  is  equal  to  the  value  of  other.get_id()  prior  to  the  call.  other
.get_id() is equal to the value of this->get_id() prior to the call.

Throws
Nothing.

SWAP NONMEMBER FUNCTION FOR STD::THREADS
Exchanges  ownership  of  their  associated  threads  of  execution  between  two  std::
thread objects.

Declaration
```cpp
void swap(thread& lhs,thread& rhs) noexcept;
```

Effects
lhs.swap(rhs)

Throws
Nothing.

STD::THREAD::JOINABLE MEMBER FUNCTION
Queries whether or not *this has an associated thread of execution.

Declaration
```cpp
bool joinable() const noexcept;
```

Returns
true if *this has an associated thread of execution, false otherwise.

Throws
Nothing.

STD::THREAD::JOIN MEMBER FUNCTION
Waits for the thread of execution associated with *this to finish.

Declaration
```cpp
void join();
```

Preconditions
this->joinable() would return true.

Effects
Blocks the current thread until the thread of execution associated with *this has
finished.

Postconditions
this->get_id()==id(). The thread of execution associated with *this prior to the
call has finished.

Synchronization
The completion of the thread of execution associated with *this prior to the call
happens-before the call to join() returns.

Throws
std::system_error if the effects can’t be achieved or this->joinable()  returns
false.

STD::THREAD::DETACH MEMBER FUNCTION
Detaches the thread of execution associated with *this to finish.

Declaration
```cpp
void detach();
```

Preconditions
this->joinable()returns true.

Effects
Detaches the thread of execution associated with *this.

Postconditions
this->get_id()==id(), this->joinable()==false

The thread of execution associated with *this prior to the call is detached and no
```cpp
longer has an associated std::thread object.
```

Throws
std::system_error  if  the  effects  can’t  be  achieved  or  this->joinable()returns
false on invocation.

<thread> header

STD::THREAD::GET_ID MEMBER FUNCTION
Returns a value of type std::thread::id that identifies the thread of execution associated with *this.

Declaration
```cpp
thread::id get_id() const noexcept;
```

Returns
If  *this  has  an  associated  thread  of  execution,  returns  an  instance  of  std::
thread::id  that  identifies  that  thread.  Otherwise  returns  a  default-constructed
```cpp
std::thread::id.
```

Throws
Nothing.

STD::THREAD::HARDWARE_CONCURRENCY STATIC MEMBER FUNCTION
Returns a hint as to the number of threads that can run concurrently on the current
hardware.

Declaration
```cpp
unsigned hardware_concurrency() noexcept;
```

Returns
The number of threads that can run concurrently on the current hardware. This
may be the number of processors in the system, for example. Where this information is not available or well-defined, this function returns 0.

Throws
Nothing.

D.7.2 Namespace this_thread

The functions in the std::this_thread namespace operate on the calling thread.

STD::THIS_THREAD::GET_ID NONMEMBER FUNCTION
Returns a value of type std::thread::id that identifies the current thread of execution.

Declaration
```cpp
thread::id get_id() noexcept;
```

Returns
An instance of std::thread::id that identifies the current thread.

Throws
Nothing.

STD::THIS_THREAD::YIELD NONMEMBER FUNCTION
Used to inform the library that the thread that invoked the function doesn’t need to
run at the point of the call. Commonly used in tight loops to avoid consuming excessive CPU time.

Declaration
```cpp
void yield() noexcept;
```

Effects
Provides the library an opportunity to schedule something else in place of the current thread.

Throws
Nothing.

STD::THIS_THREAD::SLEEP_FOR NONMEMBER FUNCTION
Suspends execution of the current thread for the specified duration.

Declaration
```cpp
template<typename Rep,typename Period>
void sleep_for(std::chrono::duration<Rep,Period> const& relative_time);
```

Effects
Blocks the current thread until the specified relative_time has elapsed.

NOTE The  thread  may  be  blocked  for  longer  than  the  specified  duration.
Where possible, the elapsed time is determined by a steady clock.

Throws
Nothing.

STD::THIS_THREAD::SLEEP_UNTIL NONMEMBER FUNCTION
Suspends  execution  of  the  current  thread  until  the  specified  time  point  has  been
reached.

Declaration
```cpp
template<typename Clock,typename Duration>
void sleep_until(
    std::chrono::time_point<Clock,Duration> const& absolute_time);
```

Effects
Blocks the current thread until the specified absolute_time has been reached for
the specified Clock.

NOTE There’s no guarantee as to how long the calling thread will be blocked
for,  only  that  Clock::now()  returned  a  time  equal  to  or  later  than  abso-
lute_time at the point at which the thread became unblocked.

Throws
Nothing.
