import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the site heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", {
        name: /pilots guide to medical certification/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders an introductory description", () => {
    render(<Home />);
    expect(screen.getByText(/search faa medical certification/i)).toBeInTheDocument();
  });
});
