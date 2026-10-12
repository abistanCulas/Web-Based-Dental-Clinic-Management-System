import apiClient from "./client";
import { getImageUrl } from "./upload";

/**
 * Normalizes a service DTO from backend
 */
export function normalizeService(dto) {
  if (!dto) return null;
  const rawPrice =
    dto.price !== null && dto.price !== undefined && !isNaN(Number(dto.price))
      ? Number(dto.price)
      : null;

  const formattedPrice =
    rawPrice !== null
      ? `LKR ${rawPrice.toLocaleString()}`
      : typeof dto.price === "string"
      ? dto.price.startsWith("LKR")
        ? dto.price
        : `LKR ${dto.price}`
      : "";

  const imgUrl = getImageUrl(dto.imageUrl || dto.image || dto.photoUrl || dto.imagePath);

  return {
    id: dto.id,
    serviceCode: dto.serviceCode || "",
    name: dto.name || dto.serviceName || dto.title || "Dental Service",
    category: dto.category || dto.serviceCategory || "General Dentistry",
    duration: dto.duration || "",
    price: formattedPrice,
    rawPrice: rawPrice,
    desc: dto.desc || dto.description || "",
    description: dto.description || dto.desc || "",
    icon: dto.icon || "checkup",
    status: dto.status || "ACTIVE",
    imageUrl: imgUrl,
    image: imgUrl,
  };
}

export const servicesApi = {
  /**
   * Fetch active dental services (public)
   * GET /api/services
   * @returns {Promise<Array>}
   */
  async getServices() {
    try {
      const response = await apiClient.get("/services");
      return Array.isArray(response.data)
        ? response.data.map(normalizeService).filter(Boolean)
        : [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch all dental services including inactive (admin)
   * GET /api/services/admin
   * @returns {Promise<Array>}
   */
  async getAllServicesAdmin() {
    const response = await apiClient.get("/services/admin");
    return Array.isArray(response.data)
      ? response.data.map(normalizeService).filter(Boolean)
      : [];
  },

  /**
   * Fetch a service by ID from backend
   * GET /api/services/{id}
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async getServiceById(id) {
    try {
      const response = await apiClient.get(`/services/${id}`);
      return normalizeService(response.data);
    } catch {
      return null;
    }
  },

  /**
   * Create a new dental service (admin only)
   * POST /api/services
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createService(data) {
    const priceVal =
      typeof data.price === "number"
        ? data.price
        : parseFloat(String(data.price || "0").replace(/[^0-9.]/g, ""));

    const payload = {
      serviceCode: data.serviceCode?.trim() || undefined,
      name: data.name?.trim(),
      category: data.category?.trim(),
      duration: data.duration?.trim(),
      price: isNaN(priceVal) ? 0 : priceVal,
      description: data.description?.trim() || data.desc?.trim() || "",
      icon: data.icon || "checkup",
      status: data.status || "ACTIVE",
      imageUrl: data.imageUrl || data.image || undefined,
    };

    const response = await apiClient.post("/services", payload);
    return normalizeService(response.data);
  },

  /**
   * Update an existing dental service (admin only)
   * PUT /api/services/{id}
   * @param {number|string} id
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateService(id, data) {
    const priceVal =
      typeof data.price === "number"
        ? data.price
        : parseFloat(String(data.price || "0").replace(/[^0-9.]/g, ""));

    const payload = {
      serviceCode: data.serviceCode?.trim() || undefined,
      name: data.name?.trim(),
      category: data.category?.trim(),
      duration: data.duration?.trim(),
      price: isNaN(priceVal) ? 0 : priceVal,
      description: data.description?.trim() || data.desc?.trim() || "",
      icon: data.icon || "checkup",
      status: data.status || "ACTIVE",
      imageUrl: data.imageUrl || data.image || undefined,
    };

    const response = await apiClient.put(`/services/${id}`, payload);
    return normalizeService(response.data);
  },

  /**
   * Delete a dental service (admin only)
   * DELETE /api/services/{id}
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async deleteService(id) {
    const response = await apiClient.delete(`/services/${id}`);
    return response.data;
  },
};

export default servicesApi;
