import { readFileSync } from 'fs';

function solve() {

    let inputData;

    try {
        const rawInput = readFileSync(0, 'utf-8');
        inputData = JSON.parse(rawInput);
    } catch (e) {
        console.error("Error parsing JSON input:", e.message);
        process.exit(1);
    }

    const { queries, rooms, range } = inputData;

    // 1. SETUP: Create a booking registry for every room
    // Key: roomId, Value: Array of {start, end} objects
    const roomBookings = {};
    rooms.forEach(roomId => {
        roomBookings[roomId] = [];
    });

    const pendingQueries = [];
    const finalQueries = [];

    // 2. PHASE 1: Handle "Fixed" (Pre-assigned) Queries
    // These are immovable. We must respect them first.
    queries.forEach(q => {
        if (q.assigned === true && q.roomId && roomBookings[q.roomId]) {
            // It is assigned and the room exists
            finalQueries.push(q);
            // Lock this slot in the room
            roomBookings[q.roomId].push({
                start: q.checkIn,
                end: q.checkOut
            });
        } else {
            // It is unassigned or invalid assignment -> Needs Scheduling
            q.assigned = false;
            q.roomId = null;
            pendingQueries.push(q);
        }
    });

    // 3. OPTIMIZATION FOR PRIORITY #1 (Maximize Assigned Queries)
    // We sort by Check-OUT time.
    // Logic: Finishing tasks early leaves more room for subsequent tasks.
    pendingQueries.sort((a, b) => {
        if (a.checkOut < b.checkOut) return -1;
        if (a.checkOut > b.checkOut) return 1;
        return 0;
    });

    // Helper: Check if a time slot overlaps with any existing booking
    const hasOverlap = (existingBookings, newStart, newEnd) => {
        for (const booking of existingBookings) {
            // Intersection formula: StartA < EndB && EndA > StartB
            if (newStart < booking.end && newEnd > booking.start) {
                return true; // Clash found
            }
        }
        return false;
    };

    // 4. PHASE 2: Allocation Loop
    // OPTIMIZATION FOR PRIORITY #2 & #3 (Minimize Rooms & Respect Order)
    for (const query of pendingQueries) {
        
        let allocated = false;

        if (range && (query.checkIn < range.from || query.checkOut > range.to)) {
            // before allocating pending queries, ensure each query's checkIn/checkOut falls within range.from..range.to; skip and leave unassigned if not
            finalQueries.push(query);
            continue;
        }

        // Iterate rooms in strict order (e.g., Room101, then Room102...)
        for (const roomId of rooms) {
            const currentBookings = roomBookings[roomId];

            // Check if this room has space for this specific time
            if (!hasOverlap(currentBookings, query.checkIn, query.checkOut)) {
                
                // SUCCESS: We found a slot.
                query.assigned = true;
                query.roomId = roomId;
                
                // Add to bookings so future queries don't clash with this one
                currentBookings.push({
                    start: query.checkIn,
                    end: query.checkOut
                });

                allocated = true;
                break; 
            }
        }
        
        // Add to final list (whether assigned or not)
        finalQueries.push(query);
    }

    // 5. FINAL FORMATTING
    // The requirement states output must be sorted by checkIn date
    finalQueries.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    const output = {
        queries: finalQueries,
        rooms: rooms,
        range: range
    };

    console.log(JSON.stringify(output, null, 2));
}

solve();
