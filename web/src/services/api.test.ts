import { describe, it, expect, vi, beforeEach } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { api, moviesService, toErrorMessage } from "./api";

/**
 * These cover the two things the client is actually responsible for: hitting
 * the right endpoint with the right params, and turning an axios failure into
 * a message a user can read. Response shapes are already pinned by the API's
 * own integration tests, so re-asserting them here would be duplication.
 */

const get = vi.spyOn(api, "get");

beforeEach(() => {
  // `mockClear`, not `mockReset`: on a spy, Vitest's reset restores the real
  // implementation, which would fire actual HTTP requests from jsdom.
  get.mockClear();
  get.mockResolvedValue({ data: { total: 0, limit: 20, offset: 0, items: [] } });
});

describe("moviesService", () => {
  it("sends the title search with pagination params", async () => {
    await moviesService.searchByTitle("matrix");
    expect(get).toHaveBeenCalledWith("/movies/by-title", {
      params: { title: "matrix", limit: 20, offset: 0 },
    });
  });

  it("omits an unset genre or year when browsing", async () => {
    await moviesService.browse({ genre: "Comedy" });
    expect(get).toHaveBeenCalledWith("/movies/by-year-genre", {
      params: { genre: "Comedy", year: undefined, limit: 20, offset: 0 },
    });
  });

  it("passes both filters when both are set", async () => {
    await moviesService.browse({ genre: "Comedy", year: 1995 }, 20, 40);
    expect(get).toHaveBeenCalledWith("/movies/by-year-genre", {
      params: { genre: "Comedy", year: 1995, limit: 20, offset: 40 },
    });
  });

  it("requests a movie by id", async () => {
    get.mockResolvedValue({ data: { id: 1 } });
    await moviesService.byId(1);
    expect(get).toHaveBeenCalledWith("/movies/1");
  });
});

describe("toErrorMessage", () => {
  function axiosErrorWith(status: number, statusText: string, data: unknown) {
    const error = new AxiosError("Request failed", "ERR_BAD_REQUEST");
    error.response = {
      status,
      statusText,
      data,
      headers: new AxiosHeaders(),
      config: { headers: new AxiosHeaders() },
    };
    return error;
  }

  it("surfaces the API's validation message", () => {
    const error = axiosErrorWith(400, "Bad Request", {
      message: "querystring must have required property 'k'",
    });
    expect(toErrorMessage(error)).toBe("querystring must have required property 'k'");
  });

  it("falls back to the status line when the body has no message", () => {
    const error = axiosErrorWith(500, "Internal Server Error", "boom");
    expect(toErrorMessage(error)).toBe("500 Internal Server Error");
  });

  it("uses the axios message when the request never got a response", () => {
    expect(toErrorMessage(new AxiosError("Network Error"))).toBe("Network Error");
  });

  it("handles non-axios failures", () => {
    expect(toErrorMessage(new Error("kaboom"))).toBe("kaboom");
  });
});
