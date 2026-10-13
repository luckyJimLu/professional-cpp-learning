---
id: cpp-concurrency-13-appendix-b
title: "Appendix B: Brief comparison of concurrency libraries"
titleEn: "Appendix B: Brief comparison of concurrency libraries"
order: 53
category: specialized
description: "Overview and trade-offs between standard C++ threads, Boost.Thread, OpenMP, and TBB."
tags: ["C++", "Boost.Thread", "OpenMP", "TBB", "Concurrency Libraries"]
---

# Appendix B: Brief comparison of concurrency libraries

Brief comparison of
concurrency libraries

Concurrency and multithreading support in programming languages and libraries
aren’t something new, even though standardized support in C++ is new. For example, Java has had multithreading support since it was first released, platforms that
conform  to  the  POSIX  standard  provide  a  C  interface  for  multithreading,  and
Erlang provides support for message-passing concurrency. There are even C++ class
libraries, such as Boost, that wrap the underlying programming interface for multithreading used on any given platform (whether it’s the POSIX C interface or something else) to provide a portable interface across the supported platforms.

  For  those  who  are  already  experienced  in  writing  multithreaded  applications
and would like to use that experience to write code using the new C++ multithreading facilities, this appendix provides a comparison between the facilities available in
Java, POSIX C, C++ with the Boost Thread Library, and C++11, along with crossreferences to the relevant chapters of this book.

r
e
t
p
a
h

e
n
e
r
e
- e
r

+
+

s
a
e
r
h
t

t
s
o
o
B

S
O
P

a
a
J

e
r
u
t
a
e
F

r
e
t
p
a
h

n
a

s
s
a
a
e
r
h
t
:
:
t
s

n
a

s
s
a
a
e
r
h
t
:
:
t
s
o
o
b

s
n
o
t
n
u
- r
e
b
e

s
n
o
t
n
u
- r
e
b
e

:
s
n
o
t
n
u
- P
A

e
t
a
o
s
s
a

,

)
(
e
t
a
e
r
_
a
e
r
h
t
p

n
a

e
p
y
t
t
_
a
e
r
h
t
p

n
a
,

)
(
h
a
t
e
_
a
e
r
h
t
p

)
(
n
o
j
_
a
e
r
h
t
p

r
e
t
p
a
h

n
a

s
s
a
e
t
u
:
:
t
s

n
a

s
s
a
e
t
u
:
:
t
s
o
o
b

e
p
y
t
t
_
e
t
u
_
a
e
r
h
t
p

n
a
>
<
r
a
u
g
_
k
o
:
:
t
s

>
<
r
a
u
g
_
k
o
:
:
t
s
o
o
b

,

)
(
k
o
_
e
t
u
_
a
e
r
h
t
p

>
<
k
o
_
e
u
q
n
u
:
:
t
s

>
<
k
o
_
e
u
q
n
u
:
:
t
s
o
o
b
n
a

,

)
(
k
o
n
u
_
e
t
u
_
a
e
r
h
t
p

,
s
n
o
t
n
u
- r
e
b
e

,
s
n
o
t
n
u
- r
e
b
e

:
s
n
o
t
n
u
- P
A

e
t
a
o
s
s
a

n
a

s
e
t
a
p
e
t

s
e
t
a
p
e
t

.
t
e

a
e
r
h
t
.
g
n
a
.
a
a
j

s
s
a

g
n
t
r
a
t
S

s
a
e
r
h
t

e
z
n
o
r
h
n
y
s

s
k
o
b

n
o
s
u
e

a
u
t
u

r
e
t
p
a
h

_
n
o
t
n
o
:
:
t
s

_
n
o
t
n
o
:
:
t
s
o
o
b

e
p
y
t
t
_
n
o
_
a
e
r
h
t
p

)
(
y
- t
o
n
n
a
)
(
t
a
w

_
n
o
t
n
o
:
:
t
s

_
n
o
t
n
o
:
:
t
s
o
o
b

,

)
(
t
a
w
_
n
o
_
a
e
r
h
t
p

,
s
s
a
t
e
j
b
O
.
g
n
a
.
a
a
j

n
a
e
b
a
r
a

n
a
e
b
a
r
a

:
s
n
o
t
n
u
- P
A

e
t
a
o
s
s
a

n
a

e
h
t

- o

s
o
h
t
e

/
s
r
o
t
n
o

a

r
o
- s
t
a
w

e
t
a
e
r
p

n
a

s
e
s
s
a
y
n
a
_
e
b
a
r
a

n
a

s
e
s
s
a
y
n
a
_
e
b
a
r
a

_
e
t
_
n
o
_
a
e
r
h
t
p

e
z
n
o
r
h
n
y
s
e
s
n

e
s
u

s
n
o
t
n
u
- r
e
b
e

s
n
o
t
n
u
- r
e
b
e

.
t
e
,

)
(
t
a
w

s
k
o
b

r
e
t
p
a
h

r
e
t
p
a
h

s
r
e
t
p
a
h

n
a

_
a
e
r
h
t
_
o
t
a
:
:
t
s

n
o
t
n
u
- )
(
e
n
e
- s
s
a
>
<
o
t
a
:
:
t
s

,
e
t
a
p
e
t

A
/
N

r
e
t
p
a
h

,
s
e
p
y
t

_
o
t
a
:
:
t
s

A
/
N

A
/
N

r
e
t
p
a
h

,
>
<
e
r
u
t
u
- :
:
t
s

>
<
e
r
u
t
u
- _
e
u
q
n
u
:
:
t
s
o
o
b

>
<
e
r
u
t
u
- _
e
r
a
h
s
:
:
t
s

n
a

>
<
e
r
u
t
u
- _
o
t
a
:
:
t
s

s
e
t
a
p
e
t

s
s
a

n
a

>
<
e
r
u
t
u
- _
e
r
a
h
s
:
:
t
s
o
o
b

s
e
t
a
p
e
t

s
s
a

A
/
N

A
/
N

A
/
N

,
s
e
b
a
r
a
e
t
a
o

-

a
r
e
p
o

o
t
A

e
h
t

n

s
e
p
y
t

e
h
t

n
a

s
n
o
t

t
n
e
r
r
u
n
o
.
t
u
.
a
a
j

e
g
a
k
a
p
o
t
a
.

-
y
n
e
r
r
u
n
o

-

e
e
r
a
w
a

e
o
y
r
o

A
/
N

e
h
t

n

s
r
e
n
a
t
n
o

e
h
T

-

e
- a
s
a
e
r
h
T

t
n
e
r
r
u
n
o
.
t
u
.
a
a
j

s
r
e
n
a
t
n
o

e
g
a
k
a
p

A
/
N

t
n
e
r
r
u
n
o
.
t
u
.
a
a
j

s
e
r
u
t
u
F

n
a

e
a
- r
e
t
n

e
r
u
t
u
- .

s
e
s
s
a

e
t
a
o
s
s
a

A
/
N

t
n
e
r
r
u
n
o
.
t
u
.
a
a
j

r
o
t
u
e
E
o
o
P
a
e
r
h
T
.

a
e
r
h
T

s
o
o
p

s
s
a

A
/
N

n
o
t
n
u
- r
e
b
e

)
(
t
p
u
r
r
e
t
n

)
(
e
n
a
_
a
e
r
h
t
p

- o

o
h
t
e
)
(
t
p
u
r
r
e
t
n

a
e
r
h
T

s
s
a
a
e
r
h
t
:
:
t
s
o
o
b

- o

a
e
r
h
T
.
g
n
a
.
a
a
j

n
o
t
p
u
r
r
e
t
n
