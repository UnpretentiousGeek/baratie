import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Recipe } from '../types/recipe';

export const generateRecipePDF = (recipe: Recipe) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = 20;

    // Helper to check page break
    const checkPageBreak = (height: number) => {
        if (yPos + height >= doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    };

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    const titleLines = doc.splitTextToSize(recipe.title, pageWidth - 2 * margin);
    doc.text(titleLines, margin, yPos);
    yPos += titleLines.length * 10 + 5;

    // Macros
    if (recipe.nutrition) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const macros = [
            `${recipe.nutrition.calories || 0} Calories`,
            `${recipe.nutrition.protein || 0}g Protein`,
            `${recipe.nutrition.carbs || 0}g Carbs`,
            `${recipe.nutrition.fat || 0}g Fat`
        ].join('  •  ');

        doc.text(macros, margin, yPos);
        yPos += 15;
    }

    // Ingredients
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ingredients', margin, yPos);
    yPos += 10;

    // Prepare ingredients data for table
    // We need to handle sections if they exist, or just a flat list
    // The recipe.ingredients is an array of strings. 
    // If sections exist, they are usually marked in a specific way in the string or we parse them.
    // Based on previous context, `detectRecipeSections` might have structured them, 
    // but the type definition usually has them as string[].
    // However, `getIngredientSections` in `recipeUtils` parses them.
    // Let's use a simple approach: just list them, but if a line ends with ':' it's likely a header.

    const ingredientRows: string[][] = [];
    recipe.ingredients.forEach(ing => {
        // Check if it looks like a section header (e.g., "For the sauce:")
        if (ing.trim().endsWith(':') || ing.trim().toUpperCase() === ing.trim() && ing.length < 30) {
            // It's a header, make it bold or distinct in the table? 
            // Actually, autotable supports styling. We can pass a specific style for this row.
            // For simplicity, we'll just add it.
            ingredientRows.push([ing]);
        } else {
            ingredientRows.push([ing]);
        }
    });

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: ingredientRows,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 'auto' } },
        margin: { left: margin, right: margin },
        didParseCell: (data) => {
            // Bold section headers
            const text = data.cell.raw as string;
            if (typeof text === 'string' && (text.trim().endsWith(':') || (text === text.toUpperCase() && text.length > 3 && text.length < 40))) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [0, 0, 0]; // Black
            }
        }
    });

    // Update yPos after table
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Instructions
    checkPageBreak(20);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions', margin, yPos);
    yPos += 10;

    const instructionRows = recipe.instructions.map((inst, index) => [String(index + 1), inst]);

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: instructionRows,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 4, overflow: 'linebreak' },
        columnStyles: {
            0: { cellWidth: 10, fontStyle: 'bold', valign: 'top' },
            1: { cellWidth: 'auto', valign: 'top' }
        },
        margin: { left: margin, right: margin },
    });

    // Save
    const safeTitle = recipe.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`${safeTitle}_recipe.pdf`);
};
