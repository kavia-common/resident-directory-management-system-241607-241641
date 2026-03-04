import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders resident directory title", () => {
  render(<App />);
  const title = screen.getByText(/resident directory/i);
  expect(title).toBeInTheDocument();
});
