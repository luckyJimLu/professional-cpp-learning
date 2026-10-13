# Modem Diagnostic System PlantUML Diagrams

This page is consistent with [Unified Design Baseline](01-diagnostics-unified-design.md) and [C++ Implementation Architecture](02-cpp-architecture-and-interactions.md): ModemLog and CHR each utilize a dedicated TCP Socket; TCPDump captures packets via a local bypass on the MCU and is no longer modeled as a third Modem socket. The illustrations convey the recommended design rather than driver-level implementation guarantees. Figures 10 through 12 detail C++ modules and their runtime interactions.

## 1. Overall Data Path: Dual Sockets and Local Snapshot

![1. Overall Data Path: Dual Sockets and Local Snapshot](images/1o16aq3.svg)

## 2. Socket Reactor Fair Scheduling

![2. Socket Reactor Fair Scheduling](images/1jpwkyj.svg)

## 3. Capture Tap Failure Pass-Through Flow

![3. Capture Tap Failure Pass-Through Flow](images/sybqdb.svg)

## 4. Slot Ownership State Machine

![4. Slot Ownership State Machine](images/1rijokv.svg)

## 5. Public Network and IPC Routing Boundary

![5. Public Network and IPC Routing Boundary](images/6rp55a.svg)

## 6. Safe Business Quiescence and Stop Protocol

![6. Safe Business Quiescence and Stop Protocol](images/1te00e6.svg)

## 7. Packet RX/TX and Snapshot Copy Sequence

![7. Packet RX/TX and Snapshot Copy Sequence](images/18jpkp8.svg)

## 8. Tiered Backoff Under Storage Overload

![8. Tiered Backoff Under Storage Overload](images/1ksmmb0.svg)

## 9. Session State Machine (Not Thread Lifecycle)

![9. Session State Machine (Not Thread Lifecycle)](images/1w70ugs.svg)

## Critical Reading Constraints

- Capture failure drops only the copy; the original packet continues unaffected. This is not a zero-CPU guarantee.
- The two application tasks are Socket Reactor and Storage Owner, distinct from existing lwIP/driver/RTOS tasks.
- Capture RX/TX may execute concurrently; private slots and non-spinning try-guards prevent prolonged holds on lwIP pbufs.
- Storage is the single consumer managing FIL handles; buffer recycling and filesystem persistence are decoupled events.
- Interface layers, offload semantics, PCAP LinkType, and invocation contexts align strictly with the [Baseline Design](01-diagnostics-unified-design.md).

## 10. C++ Modules and Execution Context

![10. C++ Modules and Execution Context](images/1hackrj.svg)

## 11. C++ Asynchronous Start Sequence

![11. C++ Asynchronous Start Sequence](images/gt3eci.svg)

## 12. CHR Reliable Persistence Ack Flow

![12. CHR Reliable Persistence Ack Flow](images/1ak50f5.svg)
