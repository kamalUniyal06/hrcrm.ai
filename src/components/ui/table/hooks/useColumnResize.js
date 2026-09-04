/**
 * Column resizing for the table header.
 *
 * Two responsibilities:
 *
 *   1. Update the rendered width while the user drags, so the table tracks the
 *      pointer.
 *   2. Report the width ONCE the gesture finishes, via `onResizeEnd`, so it can
 *      be stored. Nothing is reported during the drag - a resize is a metadata
 *      write, and firing one per pointermove would be dozens of writes per
 *      gesture, each carrying an `expected_value_integer` the one before it had
 *      already invalidated.
 *
 * The reported width is the CLAMPED width, the same value on screen, so the
 * stored value can never differ from what the user let go of.
 *
 * Callbacks are read through refs because the window listeners are registered
 * on pointerdown and outlive the render that created them: `resizeColumn`
 * changes identity on every render while the drag is updating state.
 */

import { useCallback, useEffect, useRef } from "react";

/** Delay before a keyboard nudge is stored, so holding an arrow key is one write. */
const KEYBOARD_COMMIT_DELAY = 600;

const IDLE = {
    accessor: null,
    startX: 0,
    startWidth: 0,
    lastWidth: 0,
};

export default function useColumnResize({
    columnWidths,
    resizeColumn,
    onResizeEnd,
}) {
    const resizeState = useRef({ ...IDLE });

    const columnWidthsRef = useRef(columnWidths);
    const resizeColumnRef = useRef(resizeColumn);
    const onResizeEndRef = useRef(onResizeEnd);

    useEffect(() => {
        columnWidthsRef.current = columnWidths;
        resizeColumnRef.current = resizeColumn;
        onResizeEndRef.current = onResizeEnd;
    }, [columnWidths, onResizeEnd, resizeColumn]);

    /*
     * Stable references for add/removeEventListener. Holding them in a ref
     * guarantees the function removed is the one that was added, whatever
     * re-renders happened in between.
     */
    const listeners = useRef({});

    /** Keep a resize inside the column's own bounds. */
    const clampToBounds = useCallback((accessor, width) => {
        const bounds = columnWidthsRef.current?.[accessor];

        if (!bounds) return width;

        const min = bounds.minWidth ?? 40;
        const max = bounds.maxWidth ?? 2000;

        return Math.max(min, Math.min(width, Math.max(min, max)));
    }, []);

    /* ------------------------------------------------------------ POINTER */

    const onPointerMove = useCallback(
        (event) => {
            const { accessor, startX, startWidth } =
                resizeState.current;

            if (!accessor) return;

            const width = clampToBounds(
                accessor,
                startWidth + (event.clientX - startX)
            );

            resizeState.current.lastWidth = width;

            resizeColumnRef.current?.(accessor, width);
        },
        [clampToBounds]
    );

    const stopResize = useCallback(() => {
        const { accessor, startWidth, lastWidth } =
            resizeState.current;

        window.removeEventListener(
            "pointermove",
            listeners.current.move
        );

        window.removeEventListener(
            "pointerup",
            listeners.current.up
        );

        window.removeEventListener(
            "pointercancel",
            listeners.current.up
        );

        document.body.style.cursor = "";
        document.body.style.userSelect = "";

        resizeState.current = { ...IDLE };

        if (!accessor) return;

        /*
         * A click on the handle without movement is not a resize. Sending it
         * would be a write whose value already matches the stored one.
         */
        if (Math.round(lastWidth) === Math.round(startWidth)) {
            return;
        }

        onResizeEndRef.current?.(
            accessor,
            Math.round(lastWidth),
            Math.round(startWidth)
        );
    }, []);

    listeners.current.move = onPointerMove;
    listeners.current.up = stopResize;

    const startResize = useCallback(
        (event, accessor) => {
            event.preventDefault();
            event.stopPropagation();

            const startWidth =
                columnWidthsRef.current?.[accessor]
                    ?.width || 200;

            resizeState.current = {
                accessor,
                startX: event.clientX,
                startWidth,
                lastWidth: startWidth,
            };

            document.body.style.cursor =
                "col-resize";

            document.body.style.userSelect =
                "none";

            window.addEventListener(
                "pointermove",
                listeners.current.move
            );

            window.addEventListener(
                "pointerup",
                listeners.current.up
            );

            window.addEventListener(
                "pointercancel",
                listeners.current.up
            );
        },
        []
    );

    /* ----------------------------------------------------------- KEYBOARD */

    /*
     * The handle is reachable by keyboard, so the same resize is available
     * without a pointer. Nudges are collected and stored once the user stops,
     * and `origin` holds the width before the first nudge so a rejected write
     * rolls back to a value the CRM actually confirmed.
     */
    const keyboardState = useRef({
        accessor: null,
        origin: null,
        width: null,
        timer: null,
    });

    const flushKeyboardResize = useCallback(() => {
        const { accessor, origin, width, timer } =
            keyboardState.current;

        if (timer) clearTimeout(timer);

        keyboardState.current = {
            accessor: null,
            origin: null,
            width: null,
            timer: null,
        };

        if (
            !accessor ||
            origin === null ||
            width === null ||
            Math.round(width) === Math.round(origin)
        ) {
            return;
        }

        onResizeEndRef.current?.(
            accessor,
            Math.round(width),
            Math.round(origin)
        );
    }, []);

    const nudgeResize = useCallback(
        (accessor, delta) => {
            const current =
                keyboardState.current.accessor ===
                    accessor &&
                    keyboardState.current.width !== null
                    ? keyboardState.current.width
                    : columnWidthsRef.current?.[accessor]
                        ?.width || 200;

            const origin =
                keyboardState.current.accessor ===
                    accessor
                    ? keyboardState.current.origin
                    : current;

            const width = clampToBounds(
                accessor,
                current + delta
            );

            resizeColumnRef.current?.(accessor, width);

            if (keyboardState.current.timer) {
                clearTimeout(
                    keyboardState.current.timer
                );
            }

            keyboardState.current = {
                accessor,
                origin,
                width,
                timer: setTimeout(
                    flushKeyboardResize,
                    KEYBOARD_COMMIT_DELAY
                ),
            };
        },
        [clampToBounds, flushKeyboardResize]
    );

    /* ------------------------------------------------------------ CLEANUP */

    /* Unmounting mid-drag must not leave listeners or a col-resize cursor. */
    useEffect(
        () => () => {
            window.removeEventListener(
                "pointermove",
                listeners.current.move
            );

            window.removeEventListener(
                "pointerup",
                listeners.current.up
            );

            window.removeEventListener(
                "pointercancel",
                listeners.current.up
            );

            if (keyboardState.current.timer) {
                clearTimeout(
                    keyboardState.current.timer
                );
            }

            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        },
        []
    );

    return {
        startResize,
        nudgeResize,
        flushKeyboardResize,
    };
}
