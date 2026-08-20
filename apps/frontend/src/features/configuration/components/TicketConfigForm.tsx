/**
 * Formulario de Configuración de Tiqueteras e Impresión de Tickets
 * Permite seleccionar impresora, ancho de papel, personalizar encabezado/pie y probar impresión.
 */
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Printer, Save, Loader2, Play, CheckCircle2, FileText, Smartphone, Store, Upload, Trash2, Image as ImageIcon, Crop } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

interface SystemConfiguration {
    id: string;
    ticketAutoPrintEnabled: boolean;
    ticketPrinterName: string | null;
    ticketPaperWidth: string;
    ticketHeaderTitle: string | null;
    ticketHeaderAddress: string | null;
    ticketHeaderPhone: string | null;
    ticketFooterText: string | null;
    ticketShowCustomerData: boolean;
}

interface InstalledPrinter {
    name: string;
    isDefault: boolean;
    description?: string;
}

export function TicketConfigForm() {
    const queryClient = useQueryClient();
    const [installedPrinters, setInstalledPrinters] = useState<InstalledPrinter[]>([]);
    const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
    const [isPrintingTest, setIsPrintingTest] = useState(false);

    // Estado del formulario
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(true);
    const [printerName, setPrinterName] = useState<string>('');
    const [paperWidth, setPaperWidth] = useState<string>('80mm');
    const [headerTitle, setHeaderTitle] = useState('');
    const [headerAddress, setHeaderAddress] = useState('');
    const [headerPhone, setHeaderPhone] = useState('');
    const [footerText, setFooterText] = useState('¡Gracias por su compra!');
    const [showCustomerData, setShowCustomerData] = useState(true);
    const [logoUrl, setLogoUrl] = useState('');
    const [previewFiscal, setPreviewFiscal] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
    const [isDraggingFile, setIsDraggingFile] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processSelectedFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor seleccioná un archivo de imagen válido (PNG, JPG, WebP)');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const rawUrl = event.target?.result as string;
            if (rawUrl) {
                setTempImageSrc(rawUrl);
                setCropModalOpen(true);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processSelectedFile(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFile(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processSelectedFile(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        toast.info('Logo eliminado');
    };

    // Cargar configuración
    const { data: config, isLoading } = useQuery({
        queryKey: ['configuration'],
        queryFn: async (): Promise<SystemConfiguration> => {
            const res = await api.get('/api/configuration');
            return res.data;
        },
    });

    // Cargar impresoras de Electron si está disponible
    useEffect(() => {
        const fetchPrinters = async () => {
            if (window.electronAPI?.getPrinters) {
                try {
                    setIsLoadingPrinters(true);
                    const printers = await window.electronAPI.getPrinters();
                    setInstalledPrinters(printers);
                } catch {
                    toast.error('No se pudieron obtener las impresoras del sistema');
                } finally {
                    setIsLoadingPrinters(false);
                }
            }
        };
        fetchPrinters();
    }, []);

    // Sincronizar formulario con datos recibidos
    useEffect(() => {
        if (config) {
            setAutoPrintEnabled(config.ticketAutoPrintEnabled ?? true);
            setPrinterName(config.ticketPrinterName ?? '');
            setPaperWidth(config.ticketPaperWidth ?? '80mm');
            setHeaderTitle(config.ticketHeaderTitle ?? '');
            setHeaderAddress(config.ticketHeaderAddress ?? '');
            setHeaderPhone(config.ticketHeaderPhone ?? '');
            setFooterText(config.ticketFooterText ?? '¡Gracias por su compra!');
            setShowCustomerData(config.ticketShowCustomerData ?? true);
            setLogoUrl(config.ticketLogoUrl ?? '');
        }
    }, [config]);

    // Mutation para guardar
    const saveMutation = useMutation({
        mutationFn: async (payload: Partial<SystemConfiguration>) => {
            const res = await api.patch('/api/configuration', payload);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['configuration'] });
            toast.success('Configuración de ticket guardada exitosamente');
        },
        onError: (err: any) => {
            const errorMsg = err?.response?.data?.message;
            const message = Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg;
            toast.error(message ? `Error al guardar: ${message}` : 'Error al guardar la configuración de ticket');
        },
    });

    const handleSave = () => {
        saveMutation.mutate({
            ticketAutoPrintEnabled: autoPrintEnabled,
            ticketPrinterName: printerName || null,
            ticketPaperWidth: paperWidth,
            ticketHeaderTitle: headerTitle || null,
            ticketHeaderAddress: headerAddress || null,
            ticketHeaderPhone: headerPhone || null,
            ticketFooterText: footerText || null,
            ticketShowCustomerData: showCustomerData,
            ticketLogoUrl: logoUrl || null,
        });
    };

    // Imprimir prueba
    const handlePrintTest = async () => {
        setIsPrintingTest(true);
        try {
            if (window.electronAPI?.printTestTicket) {
                const res = await window.electronAPI.printTestTicket({
                    printerName: printerName || null,
                    paperWidth,
                    headerTitle,
                    headerAddress,
                    headerPhone,
                    footerText,
                });

                if (res.success) {
                    toast.success('Página de prueba enviada a la tiquetera');
                } else {
                    toast.error(`Error al imprimir: ${res.error || 'Verifique la impresora'}`);
                }
            } else {
                // Fallback para navegador web sin Electron
                window.print();
                toast.info('Se abrió el diálogo de impresión estándar del navegador');
            }
        } catch {
            toast.error('Ocurrió un error al enviar el ticket de prueba');
        } finally {
            setIsPrintingTest(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Formulario de Parámetros */}
            <div className="lg:col-span-7 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Printer className="h-5 w-5 text-primary" />
                            Configuración de Tiquetera e Impresión
                        </CardTitle>
                        <CardDescription>
                            Personalizá la tiquetera, el formato de papel y los textos impresos para tus clientes.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Selector de Impresora */}
                        <div className="space-y-2">
                            <Label htmlFor="printer-select" className="text-sm font-semibold flex items-center justify-between">
                                Impresora Seleccionada
                                {window.electronAPI ? (
                                    <span className="text-xs text-muted-foreground font-normal">
                                        {installedPrinters.length} impresoras detectadas
                                    </span>
                                ) : (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-normal">
                                        Modo Web (diálogo navegador)
                                    </span>
                                )}
                            </Label>

                            {window.electronAPI ? (
                                <Select
                                    value={printerName || '__system_default__'}
                                    onValueChange={(val) => setPrinterName(val === '__system_default__' ? '' : val)}
                                >
                                    <SelectTrigger id="printer-select" disabled={isLoadingPrinters}>
                                        <SelectValue placeholder="Impresora por defecto del sistema" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__system_default__">(Impresora por defecto de Windows)</SelectItem>
                                        {installedPrinters
                                            .filter((p) => p && p.name && p.name.trim() !== '')
                                            .map((p) => (
                                                <SelectItem key={p.name} value={p.name}>
                                                    {p.name} {p.isDefault ? '(Predeterminada)' : ''}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input
                                    id="printer-select"
                                    value={printerName}
                                    onChange={(e) => setPrinterName(e.target.value)}
                                    placeholder="Nombre de la impresora (opcional en web)"
                                />
                            )}
                        </div>

                        {/* Ancho de Papel */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Ancho de Papel Térmico</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    type="button"
                                    variant={paperWidth === '80mm' ? 'default' : 'outline'}
                                    onClick={() => setPaperWidth('80mm')}
                                    className="flex flex-col items-center justify-center py-6 h-auto"
                                >
                                    <span className="font-bold text-base">80 mm</span>
                                    <span className="text-xs font-normal opacity-80">Tiquetera estándar</span>
                                </Button>

                                <Button
                                    type="button"
                                    variant={paperWidth === '58mm' ? 'default' : 'outline'}
                                    onClick={() => setPaperWidth('58mm')}
                                    className="flex flex-col items-center justify-center py-6 h-auto"
                                >
                                    <span className="font-bold text-base">58 mm</span>
                                    <span className="text-xs font-normal opacity-80">Tiquetera compacta</span>
                                </Button>
                            </div>
                        </div>

                        {/* Switches de Comportamiento */}
                        <div className="space-y-4 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Impresión Automática</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Imprimir ticket inmediatamente al confirmar la venta.
                                    </p>
                                </div>
                                <Switch checked={autoPrintEnabled} onCheckedChange={setAutoPrintEnabled} />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Mostrar Datos del Cliente</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Incluir nombre y documento del cliente en el comprobante impreso.
                                    </p>
                                </div>
                                <Switch checked={showCustomerData} onCheckedChange={setShowCustomerData} />
                            </div>
                        </div>

                        {/* Textos del Ticket */}
                        <div className="space-y-4 pt-2 border-t">
                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                <Store className="h-4 w-4 text-primary" />
                                Encabezado y Pie del Ticket
                            </h4>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <ImageIcon className="h-4 w-4 text-primary" />
                                        Logo del Comercio (Opcional)
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-normal">Soporta PNG, JPG, WebP</span>
                                </Label>

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                />

                                {logoUrl ? (
                                    <div className="flex items-center gap-4 p-3 border rounded-lg bg-muted/20">
                                        <div className="h-14 w-20 bg-white dark:bg-zinc-800 rounded border flex items-center justify-center p-1 overflow-hidden shrink-0">
                                            <img
                                                src={logoUrl}
                                                alt="Logo del comercio"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Logo Cargado
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                Se imprimirá centrado arriba del encabezado.
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setTempImageSrc(logoUrl);
                                                    setCropModalOpen(true);
                                                }}
                                                className="h-7 text-xs px-2.5"
                                            >
                                                <Crop className="h-3.5 w-3.5 mr-1 text-primary" /> Recortar
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleRemoveLogo}
                                                className="h-7 text-xs px-2.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-1" /> Quitar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                                            isDraggingFile
                                                ? 'border-primary bg-primary/10 scale-[1.01]'
                                                : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/10 hover:bg-muted/30'
                                        }`}
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <div className={`p-2.5 rounded-full transition-colors ${isDraggingFile ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                                                <Upload className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-primary">
                                                    {isDraggingFile ? '¡Soltá tu imagen acá!' : 'Arrastrá o seleccioná tu imagen de logo'}
                                                </span>
                                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                                    Arrastrá un archivo PNG, JPG o WebP acá o hacé clic para buscar en tu PC.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="header-title" className="text-xs font-semibold">Nombre o Título del Comercio</Label>
                                <Input
                                    id="header-title"
                                    value={headerTitle}
                                    onChange={(e) => setHeaderTitle(e.target.value)}
                                    placeholder="Ej. Mi Comercio POS"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="header-address" className="text-xs">Dirección</Label>
                                    <Input
                                        id="header-address"
                                        value={headerAddress}
                                        onChange={(e) => setHeaderAddress(e.target.value)}
                                        placeholder="Ej. Av. Corrientes 1234"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="header-phone" className="text-xs">Teléfono de Contacto</Label>
                                    <Input
                                        id="header-phone"
                                        value={headerPhone}
                                        onChange={(e) => setHeaderPhone(e.target.value)}
                                        placeholder="Ej. 11 4444-5555"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="footer-text" className="text-xs">Pie de Página / Mensaje Final</Label>
                                <Input
                                    id="footer-text"
                                    value={footerText}
                                    onChange={(e) => setFooterText(e.target.value)}
                                    placeholder="Ej. ¡Gracias por su compra!"
                                />
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t">
                            <Button
                                onClick={handleSave}
                                disabled={saveMutation.isPending}
                                className="flex-1 bg-primary"
                            >
                                {saveMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Guardar Configuración
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                onClick={handlePrintTest}
                                disabled={isPrintingTest}
                                className="flex-1"
                            >
                                {isPrintingTest ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="mr-2 h-4 w-4 text-green-600" />
                                )}
                                Imprimir Página de Prueba
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vista Previa en Vivo del Ticket */}
            <div className="lg:col-span-5">
                <Card className="sticky top-6 border-2 border-dashed">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Vista Previa
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={previewFiscal ? 'secondary' : 'ghost'}
                                    onClick={() => setPreviewFiscal(!previewFiscal)}
                                    className="text-xs h-7 px-2"
                                >
                                    {previewFiscal ? 'Modo: Fiscal (AFIP)' : 'Modo: Común'}
                                </Button>
                                <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                    {paperWidth}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex justify-center p-4 bg-muted/30">
                        {/* Simulación de rollo térmico */}
                        <div
                            className="bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 p-4 shadow-md font-mono text-xs space-y-2 transition-all border border-zinc-200 dark:border-zinc-800"
                            style={{
                                width: paperWidth === '58mm' ? '220px' : '280px',
                                fontSize: paperWidth === '58mm' ? '10px' : '11px',
                            }}
                        >
                            {/* Logo */}
                            {logoUrl && (
                                <div className="flex justify-center mb-2">
                                    <img
                                        src={logoUrl}
                                        alt="Logo preview"
                                        className="max-h-12 max-w-[120px] object-contain"
                                        onError={(e) => {
                                            (e.target as HTMLElement).style.display = 'none';
                                        }}
                                    />
                                </div>
                            )}

                            {previewFiscal ? (
                                <>
                                    {/* Encabezado Fiscal AFIP */}
                                    <div className="border border-black text-center p-1 my-1">
                                        <div className="font-bold text-sm">[ B ]</div>
                                        <div className="text-[9px]">COD. 006</div>
                                        <div className="font-bold text-xs">FACTURA B</div>
                                        <div className="text-[10px]">Nº 0001-00000042</div>
                                    </div>

                                    <div className="text-[10px] space-y-0.5">
                                        <div><b>Razón Social:</b> {headerTitle || 'MI COMERCIO S.R.L.'}</div>
                                        <div><b>CUIT:</b> 30-12345678-9</div>
                                        <div><b>Cond. IVA:</b> Resp. Inscripto</div>
                                        {headerAddress && <div><b>Domicilio:</b> {headerAddress}</div>}
                                        {headerPhone && <div><b>Tel:</b> {headerPhone}</div>}
                                        <div><b>Ing. Brutos:</b> 30-12345678-9</div>
                                        <div><b>Inicio Act:</b> 01/01/2020</div>
                                    </div>

                                    {showCustomerData && (
                                        <>
                                            <div className="border-b border-dashed border-zinc-400 my-2" />
                                            <div className="text-[10px]">
                                                <div><b>Cliente:</b> Juan Pérez</div>
                                                <div><b>CUIT/DNI:</b> 20-33444555-9</div>
                                                <div><b>Cond. IVA:</b> Consumidor Final</div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Header Común */}
                                    <div className="text-center font-bold text-sm uppercase">
                                        {headerTitle || 'NOMBRE DEL COMERCIO'}
                                    </div>
                                    {headerAddress && <div className="text-center text-zinc-600 dark:text-zinc-400">{headerAddress}</div>}
                                    {headerPhone && <div className="text-center text-zinc-600 dark:text-zinc-400">Tel: {headerPhone}</div>}

                                    <div className="border-b border-dashed border-zinc-400 my-2" />

                                    <div className="text-center font-bold">COMPROBANTE NO FISCAL</div>
                                    <div className="text-center text-zinc-500 text-[10px]">Venta Nº: V-0001</div>

                                    {showCustomerData && (
                                        <div className="text-[10px] text-zinc-600 dark:text-zinc-400 pt-1">
                                            Cliente: Juan Pérez (Consumidor Final)
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="text-center text-zinc-500 text-[10px] pt-1">
                                Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>

                            <div className="border-b border-dashed border-zinc-400 my-2" />

                            {/* Detalle de productos */}
                            <div className="space-y-1">
                                <div className="flex justify-between items-start">
                                    <div className="font-bold">Coca Cola 2.25L</div>
                                    <span className="font-bold">$ 1.500,00</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold">Alfajor Triple Maicena</div>
                                        <div className="text-[9px] text-zinc-500">3 u. x $ 1.000,00</div>
                                    </div>
                                    <span className="font-bold">$ 3.000,00</span>
                                </div>
                            </div>

                            <div className="border-b border-dashed border-zinc-400 my-2" />

                            {/* Totales */}
                            <div className="flex justify-between font-bold text-sm pt-1">
                                <span>TOTAL</span>
                                <span>$ 4.500,00</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-zinc-500">
                                <span>Pago: Efectivo</span>
                                <span>Cambio: $ 500,00</span>
                            </div>

                            {previewFiscal && (
                                <>
                                    <div className="border-b border-dashed border-zinc-400 my-2" />
                                    <div className="text-[10px] text-center font-bold space-y-0.5">
                                        <div>CAE Nº: 74123456789012</div>
                                        <div>Fecha Vto. CAE: 25/08/2026</div>
                                        <div className="text-[9px] font-normal text-zinc-500">Comprobante Autorizado por AFIP</div>
                                    </div>
                                </>
                            )}

                            <div className="border-b border-dashed border-zinc-400 my-2" />

                            {/* Footer */}
                            <div className="text-center font-medium pt-1">
                                {footerText || '¡Gracias por su compra!'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Modal de Recorte de Logo */}
            <ImageCropModal
                open={cropModalOpen}
                onOpenChange={setCropModalOpen}
                imageSrc={tempImageSrc}
                onCropComplete={(croppedBase64) => {
                    setLogoUrl(croppedBase64);
                    toast.success('Logo recortado y listo para guardar');
                }}
            />
        </div>
    );
}
