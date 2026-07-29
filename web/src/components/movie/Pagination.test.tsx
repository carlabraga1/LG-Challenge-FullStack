import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";
import { renderWithProviders } from "@/test/renderWithProviders";

beforeEach(() => {
  localStorage.clear();
});

describe("Pagination", () => {
  it("renders nothing when everything fits on one page", () => {
    const { container } = renderWithProviders(
      <Pagination total={12} pageSize={20} page={1} onPageChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("reports the current page and the total result count", () => {
    renderWithProviders(<Pagination total={91} pageSize={20} page={2} onPageChange={vi.fn()} />);
    expect(screen.getByText(/Page 2 of 5/)).toBeInTheDocument();
    expect(screen.getByText(/91 results/)).toBeInTheDocument();
  });

  it("disables Previous on the first page", () => {
    renderWithProviders(<Pagination total={91} pageSize={20} page={1} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).toBeEnabled();
  });

  it("disables Next on the last page", () => {
    renderWithProviders(<Pagination total={91} pageSize={20} page={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("moves one page at a time", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderWithProviders(
      <Pagination total={91} pageSize={20} page={3} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("translates its labels and localises the count in Portuguese", () => {
    renderWithProviders(<Pagination total={1234} pageSize={20} page={2} onPageChange={vi.fn()} />, {
      language: "pt-BR",
    });
    expect(screen.getByRole("button", { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /próxima/i })).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 62/)).toBeInTheDocument();
    // pt-BR groups thousands with a dot, en-US with a comma.
    expect(screen.getByText(/1\.234 resultados/)).toBeInTheDocument();
  });
});
