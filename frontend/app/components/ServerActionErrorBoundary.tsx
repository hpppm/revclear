"use client";

import React from "react";

interface State {
  caught: boolean;
}

export default class ServerActionErrorBoundary extends React.Component<
  React.PropsWithChildren,
  State
> {
  state: State = { caught: false };

  static getDerivedStateFromError(error: unknown): State | null {
    if (
      error instanceof Error &&
      error.message.includes("Failed to find Server Action")
    ) {
      return { caught: true };
    }
    return null;
  }

  componentDidUpdate(_: unknown, prev: State) {
    if (!this.state.caught || prev.caught) return;
    const FLAG = "sa_reload_fired";
    if (sessionStorage.getItem(FLAG)) return;
    sessionStorage.setItem(FLAG, "1");
    window.location.reload();
  }

  render() {
    return this.props.children;
  }
}
