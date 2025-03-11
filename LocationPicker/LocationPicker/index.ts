import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export class LocationPicker implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;
    private searchInput: HTMLInputElement;
    private map: L.Map | null = null;
    private marker: L.Marker | null = null;
    private selectedLocation: { city: string; state: string; country: string, address: string, pincode: number } = { city: "", state: "", country: "",address: "", pincode: 0 };
    private addressDisplay: HTMLDivElement;
    private notifyOutputChanged: () => void;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        // Create Search Bar
        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchInput.placeholder = "Search for a location...";
        this.searchInput.style.width = "100%";
        this.searchInput.style.padding = "8px";
        this.searchInput.style.marginBottom = "8px";
        this.searchInput.addEventListener("keypress", (event) => {
            if (event.key === "Enter") {
                this.searchLocation();
            }
        });

        // Create Map Container
        const mapDiv = document.createElement("div");
        mapDiv.style.width = "100%";
        mapDiv.style.height = "400px";
        
        // Create Address Display
        this.addressDisplay = document.createElement("div");
        this.addressDisplay.style.marginTop = "10px";
        this.addressDisplay.style.padding = "8px";
        this.addressDisplay.style.backgroundColor = "#f9f9f9";
        this.addressDisplay.style.border = "1px solid #ddd";
        this.addressDisplay.innerText = "Selected Location: None";

        this.container.appendChild(this.searchInput);
        this.container.appendChild(mapDiv);
        this.container.appendChild(this.addressDisplay);

        // Initialize Map
        this.map = L.map(mapDiv, {touchZoom:false,tapHold:false }).setView([51.505, -0.09], 13);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(this.map);

        // Add click event listener
        this.map.on("click", this.onMapClick.bind(this));
    }

    private async searchLocation(): Promise<void> {
        const query = this.searchInput.value.trim();
        if (!query) return;

        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const results = await response.json();

        if (results.length > 0) {
            const { lat, lon, display_name } = results[0];
            this.updateMarker(lat, lon, display_name);
        }
    }

    private async onMapClick(event: L.LeafletMouseEvent): Promise<void> {
        const { lat, lng } = event.latlng;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();

        if (data) {
            const display_name = data.display_name;
            console.log(JSON.stringify(data));
            this.selectedLocation = {
                city: data.address?.city || data.address?.town || "",
                state: data.address?.state || "",
                country: data.address?.country || "",
                address: data.address?.address || "",
                pincode:data.pincode?.pincode || 0,
            };

            this.updateMarker(lat, lng, display_name);
        }
    }

    private updateMarker(lat: number, lon: number, display_name: string): void {
        if (this.marker) {
            this.marker.setLatLng([lat, lon]).bindPopup(display_name).openPopup();
        } else {
            if (!this.map) {
                console.error("Map is not initialized.");
                return;
            }
            this.marker = L.marker([lat, lon]).addTo(this.map).bindPopup(display_name).openPopup();
        }

        this.map?.setView([lat, lon], 13);
        this.addressDisplay.innerText = `Selected Location: ${display_name}`;
        this.notifyOutputChanged();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        if (this.map) {
            this.map.invalidateSize();
        }
    }

    public getOutputs(): IOutputs {
        return {
            city: this.selectedLocation.city,
            state: this.selectedLocation.state,
            country: this.selectedLocation.country,
            address: this.selectedLocation.address,
            pincode: this.selectedLocation.pincode
        };
    }

    public destroy(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}
